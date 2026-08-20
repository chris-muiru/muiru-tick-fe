pipeline {
    agent any
    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    environment {
        // bun lives in the jenkins user's home, same as new-ui-muiru-ecomm.
        // It is not on the login shell's PATH, so the pipeline has to put it
        // there itself.
        PATH          = "/var/lib/jenkins/.bun/bin:$PATH"
        APP_NAME      = 'muiru-tick-frontend'
        DEPLOY_BASE   = '/apps/muiru/muiru-tick'
        RELEASES_BASE = "${DEPLOY_BASE}/frontend-releases"
        RELEASE_DIR   = "${RELEASES_BASE}/${BUILD_ID}"
        CURRENT_LINK  = "${DEPLOY_BASE}/frontend-current"
        NODE_ENV      = 'production'
        CI            = 'true'
    }
    stages {
        stage('Pull Source') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'muiru-secret', usernameVariable: 'GITHUB_USERNAME', passwordVariable: 'GITHUB_TOKEN')]) {
                    git url: "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/chris-muiru/muiru-tick-fe.git", branch: 'main'
                }
            }
        }
        stage('Install') {
            steps {
                // VITE_TICK_API_BASE is read through import.meta.env, which
                // Vite inlines at build time — not at runtime. Without this the
                // deployed bundle calls localhost:6690 from the visitor's
                // browser and every request fails. Same .env.prod convention as
                // new-ui-muiru-ecomm.
                sh 'cp .env.prod .env'
                sh 'bun install --frozen-lockfile'
            }
        }
        stage('Build') {
            steps {
                sh 'bun run build'
            }
        }
        stage('Deploy Release') {
            steps {
                sh """
                    mkdir -p ${RELEASE_DIR}/logs
                    cp -r .output ${RELEASE_DIR}/
                    cp ecosystem.config.js .env ${RELEASE_DIR}/

                    # Carry the previous release's hashed assets into this one.
                    # A browser holding the old HTML asks for chunks by their old
                    # hash; if those files are gone it dies on "Failed to fetch
                    # dynamically imported module" — for everyone who had a tab
                    # open when we deployed. -n keeps the new build's files.
                    if [ -L ${CURRENT_LINK} ] && [ -d ${CURRENT_LINK}/.output/public/_build ]; then
                        cp -rn ${CURRENT_LINK}/.output/public/_build/. \
                               ${RELEASE_DIR}/.output/public/_build/ 2>/dev/null || true
                    fi

                    ln -sfn ${RELEASE_DIR} ${CURRENT_LINK}
                """
            }
        }
        stage('Reload Application') {
            steps {
                sh """
                    cd ${CURRENT_LINK}
                    export JENKINS_NODE_COOKIE=dontKillMe
                    export BUILD_ID=dontKillMe

                    if pm2 describe ${APP_NAME} > /dev/null 2>&1; then
                        DEPLOY_DIR=${CURRENT_LINK} pm2 reload ${APP_NAME} --update-env
                    else
                        DEPLOY_DIR=${CURRENT_LINK} pm2 start ecosystem.config.js
                    fi
                    pm2 save
                """
            }
        }
        stage('Remove Old Releases') {
            steps {
                sh """
                    cd ${RELEASES_BASE}
                    CURRENT_RELEASE=\$(basename \$(readlink ${CURRENT_LINK}))
                    # Keep the three most recent. Pruning to one deletes the
                    # asset history that the step above depends on, so the very
                    # next deploy would break open tabs again.
                    ls -1d */ 2>/dev/null | sed 's#/##' | sort -n | head -n -3 | while read release_name; do
                        if [ "\${release_name}" != "\${CURRENT_RELEASE}" ]; then
                            rm -rf "\${release_name}"
                        fi
                    done
                """
            }
        }
    }
    post {
        failure {
            echo 'Deploy failed — previous release is still symlinked at frontend-current.'
        }
    }
}
