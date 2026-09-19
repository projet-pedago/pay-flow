pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        ACR_NAME       = 'acrpayrollflowyao'
        ACR_LOGIN      = 'acrpayrollflowyao.azurecr.io'
        AKS_RG         = 'rg-payrollflow-dev'
        AKS_NAME       = 'aks-payrollflow-dev'
        K8S_NAMESPACE  = 'payrollflow'

        BACKEND_IMAGE  = 'payrollflow/backend'
        FRONTEND_IMAGE = 'payrollflow/frontend'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=== Checkout PayRollFlow ==='
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

        stage('Azure Login') {
            steps {
                sh '''
                    echo "=== Azure Managed Identity ==="
                    az login --identity

                    echo "=== Subscription ==="
                    az account show -o table

                    echo "=== ACR Login ==="
                    az acr login --name $ACR_NAME
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    echo "=== Build backend ==="
                    docker build \
                      -t $ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      ./backend

                    echo "=== Build frontend ==="
                    docker build \
                      -t $ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER \
                      ./frontend
                '''
            }
        }

        stage('Push ACR') {
            steps {
                sh '''
                    echo "=== Push backend ==="
                    docker push $ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER

                    echo "=== Push frontend ==="
                    docker push $ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER
                '''
            }
        }

        stage('AKS Credentials') {
            steps {
                sh '''
                    echo "=== AKS credentials ==="

                    az aks get-credentials \
                      --resource-group $AKS_RG \
                      --name $AKS_NAME \
                      --admin \
                      --overwrite-existing

                    kubectl get nodes
                '''
            }
        }

        stage('Deploy AKS') {
            steps {
                sh '''
                    echo "=== Apply Kubernetes manifests ==="

                    kubectl apply -f k8s/storageclass.yaml
                    kubectl apply -f k8s/storage.yaml
                    kubectl apply -f k8s/backend-services.yaml
                    kubectl apply -f k8s/gateway.yaml
                    kubectl apply -f k8s/frontend.yaml

                    echo "=== Update backend services ==="

                    kubectl set image deployment/auth \
                      auth=$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE

                    kubectl set image deployment/hr \
                      hr=$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE

                    kubectl set image deployment/payroll \
                      payroll=$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE

                    kubectl set image deployment/time \
                      time=$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE

                    kubectl set image deployment/gateway \
                      gateway=$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE

                    echo "=== Update frontend ==="

                    kubectl set image deployment/frontend \
                      frontend=$ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER \
                      -n $K8S_NAMESPACE
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "=== Waiting for deployments ==="

                    kubectl rollout status deployment/auth \
                      -n $K8S_NAMESPACE --timeout=180s

                    kubectl rollout status deployment/hr \
                      -n $K8S_NAMESPACE --timeout=180s

                    kubectl rollout status deployment/payroll \
                      -n $K8S_NAMESPACE --timeout=180s

                    kubectl rollout status deployment/time \
                      -n $K8S_NAMESPACE --timeout=180s

                    kubectl rollout status deployment/gateway \
                      -n $K8S_NAMESPACE --timeout=180s

                    kubectl rollout status deployment/frontend \
                      -n $K8S_NAMESPACE --timeout=180s

                    echo "=== Pods ==="
                    kubectl get pods -n $K8S_NAMESPACE

                    echo "=== Services ==="
                    kubectl get svc -n $K8S_NAMESPACE

                    echo "=== Ingress ==="
                    kubectl get ingress -n $K8S_NAMESPACE
                '''
            }
        }
    }

    post {
        success {
            echo '========================================'
            echo ' PayRollFlow : CI/CD réussi'
            echo " Version déployée : ${BUILD_NUMBER}"
            echo '========================================'
        }

        failure {
            echo '========================================'
            echo ' PayRollFlow : pipeline échoué'
            echo " Build : ${BUILD_NUMBER}"
            echo '========================================'
        }

        always {
            echo "Build Jenkins : ${BUILD_NUMBER}"
        }
    }
}
