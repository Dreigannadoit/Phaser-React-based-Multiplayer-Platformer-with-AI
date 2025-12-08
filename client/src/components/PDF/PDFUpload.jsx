import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import RouteMusic from '../MusicPlayer/RouteMusic';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFUpload = () => {
    const { socket } = useSocket();

    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();

    const [numPages, setNumPages] = useState(null);
    const [pdfText, setPdfText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [uploadError, setUploadError] = useState('');
    const [showQuestionEditor, setShowQuestionEditor] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [newQuestion, setNewQuestion] = useState({ question: '', options: ['', '', '', ''], correct: 0 });
    const [questionCount, setQuestionCount] = useState(10); // Default to 10 questions

    const fileInputRef = useRef(null);
    const dropAreaRef = useRef(null);

    // Get playerName from location state
    const playerName = location.state?.playerName;


    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const goToRoom = () => {
        const currentPlayerName = playerName || 'Host';
        const encodedName = encodeURIComponent(currentPlayerName);
        navigate(`/room/${roomId}?playerName=${encodedName}&isHost=true`);
    };

    // File handling functions
    const handleFileSelect = (files) => {
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            setUploadError('Please select PDF files only');
            return;
        }

        if (pdfFiles.length > 5) {
            setUploadError('Maximum 5 PDF files allowed');
            return;
        }

        setUploadError('');
        setUploadedFiles(pdfFiles);
        processFiles(pdfFiles);
    };

    const handleFileInputChange = (event) => {
        handleFileSelect(event.target.files);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (dropAreaRef.current) {
            dropAreaRef.current.style.background = 'var(--notebook-yellow)';
        }

        const files = event.dataTransfer.files;
        handleFileSelect(files);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (dropAreaRef.current) {
            dropAreaRef.current.style.background = 'var(--pixel-light)';
        }
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (dropAreaRef.current) {
            dropAreaRef.current.style.background = 'white';
        }
    };

    const processFiles = async (files) => {
        setIsProcessing(true);
        setGeneratedQuestions([]);
        setPdfText('');

        try {
            let combinedText = '';

            for (const file of files) {
                console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
                const text = await extractTextFromPDF(file);
                combinedText += `\n\n--- Document: ${file.name} ---\n\n${text}`;
            }

            setPdfText(combinedText);
            await generateQuestionsFromText(combinedText);
        } catch (error) {
            console.error('Error processing PDF:', error);
            setUploadError('Error processing PDF files. Please try again with a different PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    const extractTextFromPDF = async (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onload = async () => {
                try {
                    console.log(`Extracting text from PDF: ${file.name}`);
                    const typedArray = new Uint8Array(fileReader.result);

                    if (typedArray.length > 10 * 1024 * 1024) {
                        reject(new Error('PDF file too large. Maximum size is 10MB.'));
                        return;
                    }

                    const pdf = await pdfjs.getDocument(typedArray).promise;
                    let fullText = '';

                    console.log(`PDF has ${pdf.numPages} pages`);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';

                        if (i >= 60) {
                            fullText += '\n[Content truncated after 60 pages]';
                            break;
                        }
                    }

                    console.log(`Extracted ${fullText.length} characters from PDF`);
                    resolve(fullText);
                } catch (error) {
                    console.error('PDF extraction error:', error);
                    reject(new Error('Failed to read PDF. The file may be corrupted or password protected.'));
                }
            };

            fileReader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(new Error('Failed to read file'));
            };

            fileReader.readAsArrayBuffer(file);
        });
    };

    const generateQuestionsFromText = async (text) => {
        try {
            const cleanText = text.replace(/[^\w\s.,!?;:'"-]/g, ' ').replace(/\s+/g, ' ').trim();
            const limitedText = cleanText.substring(0, 2500);

            console.log('Sending text to AI for question generation...');

            const apiUrl = import.meta.env.VITE_MULTI_PLYR_SERVER_API;

            const response = await axios.post(`${apiUrl}/api/ollama/generate`, {
                model: 'qwen3:8b',
                prompt: `You are an expert educational assessment specialist. Your task is to generate high-quality, comprehensive multiple-choice questions (MCQs) strictly based on the provided text, ensuring the questions are highly relevant to the core themes.

                Create exactly ${questionCount} multiple-choice questions based on the text below.

                TEXT:
                "${limitedText}"

                INSTRUCTIONS:
                - Create exactly ${questionCount} questions.
                - **Focus questions on the most critical concepts, definitions, names, or key relationships discussed in the TEXT.**
                - Questions must test **higher-order comprehension**, not just surface-level facts (e.g., test why, how, or the significance, not just what).
                - **All options (including the correct one) must be directly related to the TEXT and factually plausible in the book's context.**
                - **Distractors (incorrect options) must be highly plausible, derived from the TEXT (e.g., a real term but misapplied, or a correct detail from another context).**
                - The correct option must be **unambiguously** the best answer.
                - Questions should be clear, concise, and stand alone.

                CRITICAL FORMAT REQUIREMENTS:
                1. Return ONLY valid JSON array, no other text.
                2. Ensure property names have exactly ONE set of double quotes.
                3. Do NOT include any markdown formatting (e.g., \`\`\`json).
                4. Escape any quotes inside strings properly (e.g., 'a\\'s book').

                VALID JSON FORMAT EXAMPLE (Use a 0-based index for 'correct'):
                [
                {
                "question": "Which of the following best describes the core function of the 'Flux Capacitor' as detailed in the text?",
                "options": ["To stabilize quantum entanglement.", "To facilitate time travel.", "To convert kinetic energy.", "To track cosmic radiation."],
                "correct": 1
                }
                ]

                Return ONLY the JSON array.`,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 100000
            });

            console.log('AI response received');
            const responseText = response.data.response;
            console.log('Raw AI response:', responseText);

            let cleanResponse = responseText.trim();

            cleanResponse = cleanResponse.replace(/```json\s*/g, '');
            cleanResponse = cleanResponse.replace(/```\s*/g, '');

            cleanResponse = cleanResponse.replace(/""(\w+)":/g, '"$1":'); // Fix ""question": -> "question":
            cleanResponse = cleanResponse.replace(/\"(\s*)\"(\w+)":/g, '"$2":'); // Fix " "question": -> "question":
            cleanResponse = cleanResponse.replace(/\"\s*\"(\w+)":/g, '"$1":'); // Fix " "question": -> "question":

            cleanResponse = cleanResponse.replace(/\"options":\s*"([^"]*)"/g, (match, options) => {
                if (!options.startsWith('[')) {
                    // Split by commas and create array
                    const optionsArray = options.split(',').map(opt => `"${opt.trim()}"`);
                    return `"options": [${optionsArray.join(', ')}]`;
                }
                return match;
            });

            let questions;

            try {
                questions = JSON.parse(cleanResponse);
            } catch (parseError) {
                console.log('First parse failed, trying to extract JSON...', parseError);

                const jsonMatch = cleanResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    try {
                        let jsonStr = jsonMatch[0];
                        jsonStr = jsonStr.replace(/""(\w+)":/g, '"$1":');
                        jsonStr = jsonStr.replace(/"(\w+)":\s*"(.*?)",?/g, (match, prop, value) => {
                            return `"${prop}": "${value.replace(/"/g, '\\"')}",`;
                        });
                        questions = JSON.parse(jsonStr);
                    } catch (e) {
                        console.log('Second parse failed:', e);
                        // CRITICAL CHANGE: Don't throw error here, let it go to the validation
                        questions = [];
                    }
                } else {
                    console.log('Could not parse JSON, checking if fallback needed');
                    questions = [];
                }
            }

            // CRITICAL: Only use fallback if NO valid questions were parsed
            if (Array.isArray(questions) && questions.length > 0) {
                const validatedQuestions = validateQuestions(questions);
                const limitedQuestions = validatedQuestions.slice(0, questionCount);

                // Filter out invalid questions
                const finalQuestions = limitedQuestions.filter(q =>
                    q.question && q.question.length > 10 &&
                    q.options && q.options.length === 4 &&
                    q.options.every(opt => opt && opt.length > 0)
                );

                console.log(`Generated ${finalQuestions.length} validated questions`);

                // CRITICAL CHECK: Only save if we have valid questions
                if (finalQuestions.length >= Math.floor(questionCount / 2)) { // At least 50% of requested
                    console.log(`✅ Saving ${finalQuestions.length} AI-generated questions`);
                    setGeneratedQuestions(finalQuestions);

                    if (validatedQuestions.length < questionCount) {
                        setUploadError(`Generated ${validatedQuestions.length} questions (requested ${questionCount}). Some questions were filtered out for quality.`);
                    } else {
                        setUploadError(''); // Clear any previous errors
                    }
                } else {
                    // Not enough valid questions - use fallback instead
                    console.warn(`❌ Only ${finalQuestions.length} valid questions, using fallback`);
                    throw new Error('Insufficient valid questions generated');
                }
            } else {
                throw new Error('Invalid questions format generated');
            }

        } catch (error) {
            console.error('Error generating questions:', error);
            const fallbackQuestions = generateFallbackQuestions();
            setGeneratedQuestions(fallbackQuestions);
            setUploadError(`AI generation failed. Using ${fallbackQuestions.length} fallback questions. Try adjusting the question count or using a different PDF.`);

            // CRITICAL: Log that we're using fallback
            console.error('⚠️ USING FALLBACK QUESTIONS:', fallbackQuestions);
        }
    };

    const validateQuestions = (questions) => {
        if (!Array.isArray(questions)) {
            throw new Error('Questions must be an array');
        }

        return questions.map((q, index) => {
            // Fix common issues
            let questionText = q.question || q.questionText || `Question ${index + 1}`;

            // Remove any extra quotes
            if (typeof questionText === 'string') {
                questionText = questionText.replace(/^"|"$/g, '').trim();
            }

            let options = q.options || ['Option A', 'Option B', 'Option C', 'Option D'];
            if (!Array.isArray(options) || options.length !== 4) {
                options = ['Option A', 'Option B', 'Option C', 'Option D'];
            }

            // Clean up each option
            options = options.map((opt, i) => {
                if (typeof opt !== 'string') {
                    return `Option ${String.fromCharCode(65 + i)}`;
                }
                return opt.replace(/^"|"$/g, '').trim() || `Option ${String.fromCharCode(65 + i)}`;
            });

            let correct = parseInt(q.correct) || 0;
            if (correct < 0 || correct > 3) correct = 0;

            return {
                question: questionText,
                options: options,
                correct: correct
            };
        });
    };

    const generateFallbackQuestions = () => {
        // Generate fallback questions based on the requested count
        const baseQuestions = [
            {
                question: "Based on the document, what is the primary subject or main topic discussed?",
                options: [
                    "Scientific research methods and findings",
                    "Historical events and their significance",
                    "Technical processes and implementations",
                    "Theoretical concepts and their applications"
                ],
                correct: 0
            },
            {
                question: "Which methodology or approach was most emphasized in the text?",
                options: [
                    "Experimental analysis with controlled variables",
                    "Statistical analysis of large datasets",
                    "Case studies and qualitative observation",
                    "Theoretical modeling and simulation"
                ],
                correct: 1
            },
            {
                question: "What was identified as the key challenge or problem in the document?",
                options: [
                    "Limited data availability for analysis",
                    "Complexity of implementing solutions",
                    "Conflicting results from previous studies",
                    "Theoretical framework limitations"
                ],
                correct: 2
            },
            {
                question: "According to the text, what was the main conclusion or finding?",
                options: [
                    "A new methodology proved more effective than existing approaches",
                    "The research confirmed previously established theories",
                    "Unexpected results suggested new areas for investigation",
                    "Practical applications were successfully demonstrated"
                ],
                correct: 3
            },
            {
                question: "What recommendation was made for future work or additional research?",
                options: [
                    "Expand the study to include more diverse samples",
                    "Focus on theoretical foundations rather than applications",
                    "Replicate the study with different methodologies",
                    "Investigate related but distinct problem domains"
                ],
                correct: 0
            },
            {
                question: "Which key concept was repeatedly referenced throughout the document?",
                options: [
                    "The importance of empirical validation",
                    "The role of theoretical frameworks",
                    "The impact of technological advancements",
                    "The significance of historical context"
                ],
                correct: 1
            },
            {
                question: "What evidence was provided to support the main arguments?",
                options: [
                    "Statistical data and quantitative analysis",
                    "Case studies and expert opinions",
                    "Theoretical proofs and logical reasoning",
                    "Historical records and archival documents"
                ],
                correct: 0
            },
            {
                question: "How did the document address potential limitations or criticisms?",
                options: [
                    "By acknowledging limitations and suggesting improvements",
                    "By dismissing alternative viewpoints",
                    "By focusing only on positive outcomes",
                    "By avoiding discussion of limitations"
                ],
                correct: 0
            },
            {
                question: "What was the intended audience for this document?",
                options: [
                    "Academic researchers and specialists",
                    "General public and non-experts",
                    "Industry professionals and practitioners",
                    "Students and educators"
                ],
                correct: 0
            },
            {
                question: "Which aspect of the subject received the most detailed examination?",
                options: [
                    "Methodological approaches and techniques",
                    "Theoretical foundations and principles",
                    "Practical applications and implementations",
                    "Historical development and evolution"
                ],
                correct: 1
            }
        ];

        // Return the requested number of questions, up to the available base questions
        return baseQuestions.slice(0, Math.min(questionCount, baseQuestions.length));
    };

    // Question Management Functions
    const addNewQuestion = () => {
        setEditingQuestion(null);
        setNewQuestion({ question: '', options: ['', '', '', ''], correct: 0 });
        setShowQuestionEditor(true);
    };

    const editQuestion = (question, index) => {
        setEditingQuestion({ ...question, index });
        setNewQuestion({ ...question });
        setShowQuestionEditor(true);
    };

    const deleteQuestion = (index) => {
        const updatedQuestions = generatedQuestions.filter((_, i) => i !== index);
        setGeneratedQuestions(updatedQuestions);
    };

    const saveQuestion = () => {
        if (!newQuestion.question.trim()) {
            alert('Please enter a question');
            return;
        }

        if (newQuestion.options.some(opt => !opt.trim())) {
            alert('Please fill in all options');
            return;
        }

        let updatedQuestions;
        if (editingQuestion !== null) {
            // Editing existing question
            updatedQuestions = [...generatedQuestions];
            updatedQuestions[editingQuestion.index] = { ...newQuestion };
        } else {
            // Adding new question
            updatedQuestions = [...generatedQuestions, { ...newQuestion }];
        }

        setGeneratedQuestions(updatedQuestions);
        setShowQuestionEditor(false);
        setEditingQuestion(null);
        setNewQuestion({ question: '', options: ['', '', '', ''], correct: 0 });
    };

    const cancelEdit = () => {
        setShowQuestionEditor(false);
        setEditingQuestion(null);
        setNewQuestion({ question: '', options: ['', '', '', ''], correct: 0 });
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newQuestion.options];
        updatedOptions[index] = value;
        setNewQuestion({ ...newQuestion, options: updatedOptions });
    };

    const handleUseQuestions = () => {
        if (generatedQuestions.length === 0) {
            alert('No questions available. Please generate or create some questions first.');
            return;
        }

        const roomQuestionsKey = `gameQuestions_${roomId}`;

        console.log(`💾 Saving questions to localStorage AND server:`);
        console.log(`  - Room ID: ${roomId}`);
        console.log(`  - Questions: ${generatedQuestions.length}`);
        console.log(`  - Storage Key: ${roomQuestionsKey}`);
        console.log(`  - Sample question: ${generatedQuestions[0]?.question?.substring(0, 50)}...`);

        // 1. Save to localStorage
        localStorage.setItem(roomQuestionsKey, JSON.stringify(generatedQuestions));
        localStorage.setItem('currentRoomId', roomId);

        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        playerData.roomId = roomId;
        playerData.hasQuestions = true;
        localStorage.setItem('playerData', JSON.stringify(playerData));

        // 2. Send to server using socket
        if (socket && socket.connected) {
            console.log(`📤 Sending ${generatedQuestions.length} questions to server...`);

            // Add a small delay to ensure socket is ready
            setTimeout(() => {
                socket.emit('save-questions', {
                    roomId: roomId,
                    questions: generatedQuestions,
                    timestamp: Date.now(),
                    hostName: playerName
                });

                console.log(`✅ Questions emitted to server for room ${roomId}`);

                // Listen for confirmation
                const confirmationTimeout = setTimeout(() => {
                    console.log('⚠️ No server confirmation received, proceeding anyway...');
                }, 2000);

                socket.once('questions-updated', (data) => {
                    clearTimeout(confirmationTimeout);
                    console.log(`✅ Server confirmed questions saved for room ${data.roomId}: ${data.count} questions`);
                });
            }, 100);
        } else {
            console.warn('⚠️ Socket not connected, questions saved locally only');
            // Fallback: store in localStorage with flag to sync later
            const pendingSync = JSON.parse(localStorage.getItem('pendingQuestionSync') || '[]');
            pendingSync.push({
                roomId: roomId,
                questions: generatedQuestions,
                timestamp: Date.now()
            });
            localStorage.setItem('pendingQuestionSync', JSON.stringify(pendingSync));
            console.log('📝 Questions queued for sync when socket reconnects');
        }

        // Verify local save
        setTimeout(() => {
            const saved = JSON.parse(localStorage.getItem(roomQuestionsKey));
            console.log(`✅ Verification: ${saved ? saved.length : 0} questions saved locally`);

            if (saved && saved.length === generatedQuestions.length) {
                console.log('✅ Questions saved successfully!');
            } else {
                console.error('❌ Questions may not have saved correctly!');
            }
        }, 100);

        // Navigate back to room
        const currentPlayerName = playerName || 'Host';
        navigate(`/room/${roomId}?playerName=${encodeURIComponent(currentPlayerName)}&isHost=true`, {
            state: {
                questionsGenerated: true,
                questionCount: generatedQuestions.length,
                roomId: roomId,
                fromPDFUpload: true
            }
        });
    };

    const handleManualQuestions = () => {
        const manualQuestions = generateFallbackQuestions().slice(0, questionCount);
        setGeneratedQuestions(manualQuestions);
        setUploadError('');
    };

    const clearFiles = () => {
        setUploadedFiles([]);
        setPdfText('');
        setGeneratedQuestions([]);
        setUploadError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleQuestionCountChange = (e) => {
        const value = parseInt(e.target.value);
        if (value >= 1 && value <= 50) {
            setQuestionCount(value);
        }
    };

    return (
        <div className="pdf-upload-container">
            
            <RouteMusic musicType="room" />

            <div className="pdf-upload-header">
                <button onClick={goToRoom} className="back-button pixel-button">
                    ← Back to Room {roomId}
                </button>
                <h1 className="page-title">Question Manager</h1>
                <div className="room-info">
                    <span>Room: {roomId}</span>
                    {playerName && <span>Host: {playerName}</span>}
                </div>
            </div>

            {/* PDF Upload Section */}
            <div className="upload-section pixel-card">
                <h2>📄 Upload PDF Files</h2>

                {/* Question Count Input */}
                <div className="question-count-control">
                    <label htmlFor="questionCount">Number of questions to generate:</label>
                    <div className="count-input-group">
                        <input
                            type="number"
                            id="questionCount"
                            value={questionCount}
                            onChange={handleQuestionCountChange}
                            min="1"
                            max="50"
                            className="count-input"
                            disabled={isProcessing}
                        />
                        <span className="count-range">(1-50)</span>
                    </div>
                </div>

                {uploadError && (
                    <div className="error-message pixel-card">
                        {uploadError}
                    </div>
                )}

                <div
                    className="upload-area"
                    ref={dropAreaRef}
                    onClick={triggerFileInput}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    style={{ cursor: 'pointer' }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".pdf"
                        multiple
                        disabled={isProcessing}
                        style={{ display: 'none' }}
                    />
                    <div className="upload-prompt">
                        <div className="upload-icon">📄</div>
                        <p>
                            {isProcessing ? 'Processing PDF...' : 'Click to select PDF files or drag and drop them here'}
                        </p>
                        <small>Supported: PDF files (max 5 files, 10MB each)</small>
                        <br />
                        <small>Generating up to {questionCount} questions</small>
                    </div>
                </div>

                {uploadedFiles.length > 0 && (
                    <div className="file-list">
                        <h4>Selected Files ({uploadedFiles.length}):</h4>
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className="file-item">
                                <span>📄 {file.name}</span>
                                <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                        ))}
                        <button onClick={clearFiles} className="clear-files-button pixel-button" disabled={isProcessing}>
                            Clear Files
                        </button>
                    </div>
                )}
            </div>

            {isProcessing && (
                <div className="processing-section pixel-card">
                    <div className="loading-spinner"></div>
                    <p>Processing PDF files and generating {questionCount} questions... This may take a minute.</p>
                </div>
            )}

            {/* Question Management Section */}
            <div className="question-management-section pixel-card">
                <div className="section-header">
                    <h2>🎯 Question Management</h2>
                    <div className="management-actions">
                        <button onClick={addNewQuestion} className="add-button pixel-button">
                            ➕ Add New Question
                        </button>
                        <button onClick={handleManualQuestions} className="sample-button pixel-button">
                            🎯 Generate {questionCount} Sample Questions
                        </button>
                    </div>
                </div>

                <div className="questions-stats">
                    <span>Total Questions: {generatedQuestions.length} / {questionCount}</span>
                    {generatedQuestions.length > 0 && (
                        <button onClick={handleUseQuestions} className="use-questions-button pixel-button">
                            ✅ Use {generatedQuestions.length} Questions in Game
                        </button>
                    )}
                </div>

                {generatedQuestions.length > 0 ? (
                    <div className="questions-list">
                        {generatedQuestions.map((question, index) => (
                            <div key={index} className="question-card pixel-card">
                                <div className="question-header">
                                    <h4>Question {index + 1}</h4>
                                    <div className="question-actions">
                                        <button
                                            onClick={() => editQuestion(question, index)}
                                            className="edit-button pixel-button small"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => deleteQuestion(index)}
                                            className="delete-button pixel-button small"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                                <p className="question-text">{question.question}</p>
                                <div className="options-grid">
                                    {question.options.map((option, optIndex) => (
                                        <div
                                            key={optIndex}
                                            className={`option ${optIndex === question.correct ? 'correct' : ''}`}
                                        >
                                            <span className="option-letter">
                                                {String.fromCharCode(65 + optIndex)}
                                            </span>
                                            <span className="option-text">{option}</span>
                                            {optIndex === question.correct && (
                                                <span className="correct-badge">✓ Correct</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-questions">
                        <p>No questions yet. Upload a PDF or create questions manually.</p>
                        <p><small>Set the desired number of questions above before generating.</small></p>
                    </div>
                )}
            </div>

            {/* Question Editor Modal */}
            {showQuestionEditor && (
                <div className="modal-overlay">
                    <div className="question-editor-modal pixel-card">
                        <h3>{editingQuestion !== null ? 'Edit Question' : 'Add New Question'}</h3>

                        <div className="editor-form">
                            <div className="form-group">
                                <label>Question Text:</label>
                                <textarea
                                    value={newQuestion.question}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                                    placeholder="Enter your question here..."
                                    rows="3"
                                    className="question-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Options:</label>
                                {newQuestion.options.map((option, index) => (
                                    <div key={index} className="option-input-group">
                                        <span className="option-label">{String.fromCharCode(65 + index)}:</span>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                            className="option-input"
                                        />
                                        <label className="correct-radio">
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                checked={newQuestion.correct === index}
                                                onChange={() => setNewQuestion({ ...newQuestion, correct: index })}
                                            />
                                            Correct
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="editor-actions">
                                <button onClick={cancelEdit} className="cancel-button pixel-button">
                                    Cancel
                                </button>
                                <button onClick={saveQuestion} className="save-button pixel-button">
                                    {editingQuestion !== null ? 'Update Question' : 'Add Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFUpload;