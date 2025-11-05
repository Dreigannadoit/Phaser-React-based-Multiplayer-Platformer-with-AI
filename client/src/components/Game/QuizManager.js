export class QuizManager {
    constructor(scene) {
        this.scene = scene;
        this.quizActive = false;
        this.quizContainer = null;
        this.optionButtons = [];
        this.currentQuestion = null;
        
        this.questions = [
            {
                question: "What is 2 + 2?",
                options: ["3", "4", "5", "6"],
                correct: 1
            },
            {
                question: "What is the capital of France?",
                options: ["London", "Berlin", "Paris", "Madrid"],
                correct: 2
            },
            {
                question: "Which language runs in a web browser?",
                options: ["Java", "C", "Python", "JavaScript"],
                correct: 3
            }
        ];
    }

    preload() {
        // No need to load graphics assets anymore
        // this.scene.load.audio('quiz_correct', 'src/assets/sounds/correct.wav');
        // this.scene.load.audio('quiz_incorrect', 'src/assets/sounds/incorrect.wav');
        // this.scene.load.audio('quiz_show', 'src/assets/sounds/quiz_show.wav');
    }

    create() {
        // No Phaser UI creation needed
    }

   showQuiz() {
        this.quizActive = true;
        
        // Pause game physics
        this.scene.physics.pause();
        
        // Get random question
        this.currentQuestion = Phaser.Math.RND.pick(this.questions);
        
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
        
        // Play appropriate sound
        if (isCorrect && this.scene.sound.get('quiz_correct')) {
            this.scene.sound.play('quiz_correct');
        } else if (!isCorrect && this.scene.sound.get('quiz_incorrect')) {
            this.scene.sound.play('quiz_incorrect');
        }
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
}