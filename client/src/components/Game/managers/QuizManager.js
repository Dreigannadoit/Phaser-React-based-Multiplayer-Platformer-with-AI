export class QuizManager {
    constructor(scene, roomId) {
        this.scene = scene;
        this.roomId = roomId || this.extractRoomId();

        console.log(`📚 QuizManager constructor called for room: ${this.roomId}`);

        this.quizActive = false;
        this.currentQuestion = null;
        this.socket = null;

        if (window.socket) {
            this.socket = window.socket;
        } else if (window.io) {
            this.socket = window.io();
        }

        this.questions = this.loadQuestions();

        // Request from server as backup
        this.requestQuestionsFromServer();

        // DEBUG: Log the actual questions loaded
        console.log(`🎯 INITIAL QUESTIONS LOADED: ${this.questions.length} questions`);
        this.questions.forEach((q, i) => {
            console.log(`   Q${i + 1}: ${q.question.substring(0, 50)}...`);
        });
    }

    loadQuestions() {
        console.log(`📚 LOADING QUESTIONS - Using roomId: ${this.roomId}`);

        // Priority 1: Check localStorage first
        const localKey = `gameQuestions_${this.roomId}`;
        const localData = localStorage.getItem(localKey);

        if (localData) {
            try {
                const questions = JSON.parse(localData);
                if (Array.isArray(questions) && questions.length > 0) {
                    console.log(`✅ Loaded ${questions.length} questions from localStorage`);
                    return this.validateQuestions(questions);
                }
            } catch (error) {
                console.error('Error parsing local questions:', error);
            }
        }

        console.log('📭 No valid local questions found');
        return this.getFallbackQuestions();
    }

    requestQuestionsFromServer() {
        if (!this.socket || !this.roomId) return;

        console.log(`📤 Requesting questions from server for room ${this.roomId}...`);
        this.socket.emit('request-questions', { roomId: this.roomId });

        this.socket.once('questions-received', (data) => {
            if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                console.log(`📥 Received ${data.questions.length} questions from server`);

                // Update questions array
                this.questions = this.validateQuestions(data.questions);

                // Save to localStorage for future use
                const localKey = `gameQuestions_${this.roomId}`;
                localStorage.setItem(localKey, JSON.stringify(this.questions));
                console.log(`💾 Saved server questions to localStorage`);

                // Dispatch event to update UI if needed
                window.dispatchEvent(new CustomEvent('questions-loaded', {
                    detail: { count: this.questions.length }
                }));
            }
        });

        // Listen for updates from host
        this.socket.on('questions-updated', (data) => {
            if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                console.log(`🔄 Host updated questions: ${data.questions.length} questions`);

                // Update questions array
                this.questions = this.validateQuestions(data.questions);

                // Save to localStorage
                const localKey = `gameQuestions_${this.roomId}`;
                localStorage.setItem(localKey, JSON.stringify(this.questions));

                console.log(`💾 Updated questions from host broadcast`);
            }
        });
    }

    validateQuestions(questions) {
        if (!Array.isArray(questions)) {
            console.error('Questions is not an array');
            return this.getFallbackQuestions();
        }

        const validQuestions = questions.filter(q =>
            q &&
            q.question && typeof q.question === 'string' && q.question.length > 10 &&
            q.options && Array.isArray(q.options) && q.options.length >= 4 &&
            typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length
        );

        if (validQuestions.length === 0) {
            console.error('No valid questions found');
            return this.getFallbackQuestions();
        }

        console.log(`✅ Validated ${validQuestions.length}/${questions.length} questions`);
        return validQuestions;
    }

    getFallbackQuestions() {
        return [
            {
                question: "FALLBACK: What is 2 + 2?",
                options: ["3", "4", "5", "6"],
                correct: 1
            },
            {
                question: "FALLBACK: What is the capital of France?",
                options: ["London", "Berlin", "Paris", "Madrid"],
                correct: 2
            }
        ];
    }


    preload() {
        // No need to load graphics assets anymore
    }

    create() {
        // No Phaser UI creation needed
    }

    showQuiz() {
        this.quizActive = true;

        // Pause game physics
        this.scene.physics.pause();

        // Get random question from the loaded questions
        if (this.questions.length === 0) {
            console.error('❌ No questions available in QuizManager.showQuiz()!');
            console.error('   Questions array length:', this.questions.length);
            console.error('   Current roomId:', this.roomId);

            // Try to reload questions as a last resort
            this.questions = this.loadQuestions();

            if (this.questions.length === 0) {
                this.quizActive = false;
                this.scene.physics.resume();
                return Promise.resolve(true); // Default to correct if no questions
            }
        }

        this.currentQuestion = Phaser.Math.RND.pick(this.questions);

        console.log(`🎯 Showing quiz question:`);
        console.log(`   Question: ${this.currentQuestion.question.substring(0, 100)}...`);
        console.log(`   Options: ${this.currentQuestion.options.join(', ')}`);
        console.log(`   Correct index: ${this.currentQuestion.correct}`);

        // Dispatch custom event to show React quiz
        const quizEvent = new CustomEvent('showQuiz', {
            detail: {
                question: this.currentQuestion.question,
                options: this.currentQuestion.options,
                correctIndex: this.currentQuestion.correct
            }
        });
        window.dispatchEvent(quizEvent);

        return new Promise((resolve) => {
            this.quizResolve = resolve;
        });
    }

    handleQuizAnswer(isCorrect) {
        if (this.quizResolve) {
            this.quizResolve(isCorrect);
        }
        this.quizActive = false;

        // Resume game physics
        this.scene.physics.resume();
    }

    isQuizActive() {
        return this.quizActive;
    }

    addQuestion(question) {
        this.questions.push(question);
    }

    getQuestionCount() {
        return this.questions.length;
    }

    // Method to update questions dynamically
    updateQuestions(newQuestions) {
        this.questions = newQuestions;
        console.log(`🔄 Updated QuizManager with ${newQuestions.length} questions`);
    }
}