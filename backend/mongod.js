const mongoose = require('mongoose');
const { exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

class MongoDBDiagnostic {
    constructor() {
        this.results = {
            mongoInstalled: false,
            mongoRunning: false,
            portAvailable: false,
            canConnect: false,
            configValid: false,
            errors: []
        };
    }

    async checkMongoInstallation() {
        return new Promise((resolve) => {
            exec('mongod --version', (error, stdout, stderr) => {
                this.results.mongoInstalled = !error;
                if (error) {
                    this.results.errors.push('MongoDB not installed or not in PATH');
                }
                resolve();
            });
        });
    }

    async checkMongoProcess() {
        return new Promise((resolve) => {
            const isWin = process.platform === "win32";
            const cmd = isWin ? 'tasklist | findstr "mongod"' : 'ps aux | grep mongod';
            
            exec(cmd, (error, stdout, stderr) => {
                this.results.mongoRunning = stdout.includes('mongod');
                if (!this.results.mongoRunning) {
                    this.results.errors.push('MongoDB process not running');
                }
                resolve();
            });
        });
    }

    async checkPort() {
        return new Promise((resolve) => {
            const tester = net.createServer()
                .once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        this.results.portAvailable = true;
                        this.results.errors.push('Port 27017 is in use but might not be MongoDB');
                    } else {
                        this.results.errors.push(`Port error: ${err.message}`);
                    }
                    resolve();
                })
                .once('listening', () => {
                    tester.once('close', () => {
                        this.results.portAvailable = false;
                        this.results.errors.push('Port 27017 is not in use - MongoDB might not be running');
                        resolve();
                    }).close();
                })
                .listen(27017);
        });
    }

    async testConnection() {
        try {
            const connections = [
                'mongodb://localhost:27017',
                'mongodb://127.0.0.1:27017',
                'mongodb://0.0.0.0:27017'
            ];

            for (const uri of connections) {
                try {
                    await mongoose.connect(uri, {
                        serverSelectionTimeoutMS: 2000,
                        connectTimeoutMS: 2000
                    });
                    this.results.canConnect = true;
                    await mongoose.disconnect();
                    return;
                } catch (err) {
                    this.results.errors.push(`Failed connecting to ${uri}: ${err.message}`);
                }
            }
        } catch (err) {
            this.results.errors.push(`Connection error: ${err.message}`);
        }
    }

    async checkConfigFile() {
        const configPaths = [
            path.join(process.cwd(), 'config.js'),
            path.join(process.cwd(), 'config.json'),
            path.join(process.cwd(), '.env')
        ];

        for (const configPath of configPaths) {
            try {
                await fs.promises.access(configPath);
                this.results.configValid = true;
                return;
            } catch (err) {
                this.results.errors.push(`Config file not found at ${configPath}`);
            }
        }
    }

    async getSystemInfo() {
        return new Promise((resolve) => {
            exec('systeminfo', (error, stdout, stderr) => {
                if (!error) {
                    this.results.systemInfo = stdout;
                }
                resolve();
            });
        });
    }

    async runDiagnostics() {
        console.log('Starting MongoDB diagnostics...');
        
        await this.checkMongoInstallation();
        await this.checkMongoProcess();
        await this.checkPort();
        await this.testConnection();
        await this.checkConfigFile();
        await this.getSystemInfo();

        return this.generateReport();
    }

    generateReport() {
        const report = {
            status: {
                installation: this.results.mongoInstalled ? '✅' : '❌',
                process: this.results.mongoRunning ? '✅' : '❌',
                port: this.results.portAvailable ? '✅' : '❌',
                connection: this.results.canConnect ? '✅' : '❌',
                config: this.results.configValid ? '✅' : '❌'
            },
            errors: this.results.errors,
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (!this.results.mongoInstalled) {
            recommendations.push('Install MongoDB from https://www.mongodb.com/try/download/community');
        }
        
        if (!this.results.mongoRunning) {
            recommendations.push(`
                Start MongoDB service:
                Windows: net start MongoDB
                Linux: sudo systemctl start mongodb
                Mac: brew services start mongodb-community
            `);
        }

        if (!this.results.canConnect) {
            recommendations.push(`
                Try these connection strings in your code:
                mongoose.connect('mongodb://127.0.0.1:27017/your_database')
                mongoose.connect('mongodb://localhost:27017/your_database')
                
                Check if authentication is required:
                mongoose.connect('mongodb://username:password@127.0.0.1:27017/your_database')
            `);
        }

        return recommendations;
    }
}

// Usage
const diagnostic = new MongoDBDiagnostic();
diagnostic.runDiagnostics().then(report => {
    console.log('\nDiagnostic Report:');
    console.log(JSON.stringify(report, null, 2));
});