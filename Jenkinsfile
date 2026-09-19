pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        NODE_VERSION = '22'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=== Récupération du projet PayRollFlow ==='
                checkout scm
            }
        }

        stage('Backend - Install') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend - Build') {
            steps {
                dir('backend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Backend - Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Frontend - Install') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend - Lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Frontend - Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }
    }

    post {
        success {
            echo '========================================'
            echo ' PayRollFlow : pipeline réussi'
            echo '========================================'
        }

        failure {
            echo '========================================'
            echo ' PayRollFlow : pipeline échoué'
            echo '========================================'
        }

        always {
            echo "Build : ${BUILD_NUMBER}"
        }
    }
}
