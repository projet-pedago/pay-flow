pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        ACR_NAME       = 'acrpayrollflowyao'
        ACR_LOGIN      = 'acrpayrollflowyao.azurecr.io'
        AKS_NAME       = 'aks-payrollflow-dev'
        RESOURCE_GROUP = 'rg-payrollflow-dev'
        NAMESPACE      = 'payrollflow'
        KEYVAULT       = 'kv-payrollflow-yao'

        BACKEND_IMAGE  = 'payrollflow/backend'
        FRONTEND_IMAGE = 'payrollflow/frontend'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=== CHECKOUT PAYROLLFLOW ==='
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
                    set -e

                    echo "=== AZURE LOGIN ==="

                    az login --identity >/dev/null

                    echo "Azure Managed Identity OK"
                '''
            }
        }

        stage('ACR Login') {
            steps {
                sh '''
                    set -e

                    echo "=== ACR LOGIN ==="

                    az acr login --name "$ACR_NAME"

                    echo "ACR login OK"
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    set -e

                    echo "=== BUILD BACKEND ==="

                    docker build \
                      -t "$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -t "$ACR_LOGIN/$BACKEND_IMAGE:latest" \
                      ./backend

                    echo "=== BUILD FRONTEND ==="

                    docker build \
                      --build-arg VITE_AZURE_CLIENT_ID="61a719fe-4a65-43a0-aeaf-4f21dedfdc41" \
                      --build-arg VITE_AZURE_TENANT_ID="c8bb705c-2d97-4d0b-b692-37cc14ae4d29" \
                      --build-arg VITE_AZURE_API_CLIENT_ID="379ae343-3396-403c-b23e-87d7d10a47ca" \
                      -t "$ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER" \
                      -t "$ACR_LOGIN/$FRONTEND_IMAGE:latest" \
                      ./frontend
                '''
            }
        }

        stage('Docker Push') {
            steps {
                sh '''
                    set -e

                    echo "=== PUSH BACKEND ==="

                    docker push "$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER"
                    docker push "$ACR_LOGIN/$BACKEND_IMAGE:latest"

                    echo "=== PUSH FRONTEND ==="

                    docker push "$ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER"
                    docker push "$ACR_LOGIN/$FRONTEND_IMAGE:latest"
                '''
            }
        }

        stage('AKS Credentials') {
            steps {
                sh '''
                    set -e

                    echo "=== AKS CREDENTIALS ==="

                    az aks get-credentials \
                      --resource-group "$RESOURCE_GROUP" \
                      --name "$AKS_NAME" \
                      --admin \
                      --overwrite-existing

                    kubectl get nodes
                '''
            }
        }

        /*
         * TEMPORAIRE :
         * On conserve ce stage pendant le premier déploiement
         * de validation du CSI Key Vault.
         *
         * Une fois le CSI validé via Jenkins, ce stage pourra
         * être supprimé.
         */
        stage('Key Vault -> AKS') {
            steps {
                sh '''
                    set -e

                    echo "=== KEY VAULT -> KUBERNETES SECRET ==="

                    JWT_SECRET=$(az keyvault secret show \
                      --vault-name "$KEYVAULT" \
                      --name JWT-SECRET \
                      --query value \
                      -o tsv)

                    GRAPH_CLIENT_ID=$(az keyvault secret show \
                      --vault-name "$KEYVAULT" \
                      --name AZURE-GRAPH-CLIENT-ID \
                      --query value \
                      -o tsv)

                    GRAPH_CLIENT_SECRET=$(az keyvault secret show \
                      --vault-name "$KEYVAULT" \
                      --name AZURE-GRAPH-CLIENT-SECRET \
                      --query value \
                      -o tsv)

                    kubectl create secret generic payrollflow-secrets \
                      --namespace "$NAMESPACE" \
                      --from-literal=JWT_SECRET="$JWT_SECRET" \
                      --from-literal=AZURE_GRAPH_CLIENT_ID="$GRAPH_CLIENT_ID" \
                      --from-literal=AZURE_GRAPH_CLIENT_SECRET="$GRAPH_CLIENT_SECRET" \
                      --dry-run=client \
                      -o yaml | kubectl apply -f -

                    unset JWT_SECRET
                    unset GRAPH_CLIENT_ID
                    unset GRAPH_CLIENT_SECRET

                    echo "Kubernetes secrets updated"
                '''
            }
        }

        stage('Deploy AKS') {
            steps {
                sh '''
                    set -e

                    echo "=== APPLY KUBERNETES MANIFESTS ==="

                    echo "=== STORAGE ==="

                    kubectl apply -f k8s/storageclass.yaml
                    kubectl apply -f k8s/storage.yaml

                    echo "=== AZURE KEY VAULT CSI ==="

                    kubectl apply -f k8s/secret-provider-class.yaml

                    echo "=== BACKEND SERVICES ==="

                    kubectl apply -f k8s/backend-services.yaml

                    echo "=== GATEWAY ==="

                    kubectl apply -f k8s/gateway.yaml

                    echo "=== FRONTEND ==="

                    kubectl apply -f k8s/frontend.yaml

                    echo "=== UPDATE IMAGES ==="

                    kubectl set image deployment/auth \
                      auth="$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"

                    kubectl set image deployment/hr \
                      hr="$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"

                    kubectl set image deployment/payroll \
                      payroll="$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"

                    kubectl set image deployment/time \
                      time="$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"

                    kubectl set image deployment/gateway \
                      gateway="$ACR_LOGIN/$BACKEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"

                    kubectl set image deployment/frontend \
                      frontend="$ACR_LOGIN/$FRONTEND_IMAGE:$BUILD_NUMBER" \
                      -n "$NAMESPACE"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo "=== ROLLOUT STATUS ==="

                    kubectl rollout status deployment/auth \
                      -n "$NAMESPACE" --timeout=180s

                    kubectl rollout status deployment/hr \
                      -n "$NAMESPACE" --timeout=180s

                    kubectl rollout status deployment/payroll \
                      -n "$NAMESPACE" --timeout=180s

                    kubectl rollout status deployment/time \
                      -n "$NAMESPACE" --timeout=180s

                    kubectl rollout status deployment/gateway \
                      -n "$NAMESPACE" --timeout=180s

                    kubectl rollout status deployment/frontend \
                      -n "$NAMESPACE" --timeout=180s

                    echo "=== PODS ==="

                    kubectl get pods -n "$NAMESPACE"

                    echo "=== SERVICES ==="

                    kubectl get svc -n "$NAMESPACE"

                    echo "=== KEY VAULT CSI STATUS ==="

                    kubectl get secretproviderclass \
                      -n "$NAMESPACE"

                    kubectl get secretproviderclasspodstatus \
                      -n "$NAMESPACE"

                    echo "=== KUBERNETES SECRET KEYS ==="

                    kubectl get secret payrollflow-secrets \
                      -n "$NAMESPACE" \
                      -o jsonpath='{.data}' \
                      | grep -oE 'AZURE_GRAPH_CLIENT_ID|AZURE_GRAPH_CLIENT_SECRET|JWT_SECRET' \
                      | sort

                    echo
                    echo "=== DEPLOYMENT VERIFICATION COMPLETE ==="
                '''
            }
        }
    }

    post {

        success {
            echo '========================================'
            echo ' PayRollFlow CI/CD : SUCCESS'
            echo ' Build + ACR + AKS terminés'
            echo ' Azure Key Vault CSI vérifié'
            echo '========================================'
        }

        failure {
            echo '========================================'
            echo ' PayRollFlow CI/CD : FAILED'
            echo ' Consulte les logs Jenkins'
            echo '========================================'
        }

        always {
            echo "Build Jenkins : ${BUILD_NUMBER}"
        }
    }
}