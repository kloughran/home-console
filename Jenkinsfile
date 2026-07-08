pipeline {
    agent any
    stages {
        stage('deploy') {
            steps {
                sh 'docker compose build'
                sh 'docker compose up -d'
            }
        }
    }
}
