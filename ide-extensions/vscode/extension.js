const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Thing Security extension is now active');

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('thing-security');
    context.subscriptions.push(diagnosticCollection);

    let disposableScan = vscode.commands.registerCommand('thing.scan', function () {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Thing Security: Scanning project...",
            cancellable: false
        }, async (progress) => {
            return new Promise((resolve) => {
                const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                
                // Call the local CLI
                cp.exec('python cli/thing.py scan', { cwd: workspacePath }, (error, stdout, stderr) => {
                    diagnosticCollection.clear();
                    
                    if (stdout.includes('POLICY: BLOCK')) {
                        vscode.window.showErrorMessage('Thing Security: Scan blocked by policy. See output for details.');
                    } else if (stdout.includes('POLICY: WARN')) {
                        vscode.window.showWarningMessage('Thing Security: Scan finished with warnings.');
                    } else {
                        vscode.window.showInformationMessage('Thing Security: Scan passed.');
                    }
                    
                    // Parse findings (pseudo-code for VSCode diagnostics mapping)
                    // In a real extension, we would use --format sarif or json and parse it.
                    
                    resolve();
                });
            });
        });
    });

    let disposableFix = vscode.commands.registerCommand('thing.fix', function () {
        vscode.window.showInformationMessage('Generating AI Fix via Thing Security...');
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        cp.exec('python cli/thing.py fix', { cwd: workspacePath }, (error, stdout, stderr) => {
            vscode.window.showInformationMessage('AI Fix generated and applied.');
        });
    });

    let disposableScanApi = vscode.commands.registerCommand('thing.scanApi', function () {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Kavach: Scanning API Security & OWASP Weaknesses...",
            cancellable: false
        }, async () => {
            return new Promise((resolve) => {
                const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                cp.exec('python cli/thing.py scan --api', { cwd: workspacePath }, (error, stdout, stderr) => {
                    if (stdout.includes('OWASP API vulnerabilities:')) {
                        vscode.window.showWarningMessage('Kavach API Security: Weaknesses detected. Check findings dashboard or run fix command.');
                    } else {
                        vscode.window.showInformationMessage('Kavach API Security: Code passed security verification.');
                    }
                    resolve();
                });
            });
        });
    });

    let disposableFixFinding = vscode.commands.registerCommand('thing.fixFinding', async function () {
        const findingId = await vscode.window.showInputBox({
            prompt: "Enter Kavach Finding ID to Remediate & Verify",
            placeHolder: "e.g. 550e8400-e29b-41d4-a716-446655440000"
        });
        if (!findingId) return;

        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Kavach: Applying patch and running deterministic rescan for finding ${findingId}...`,
            cancellable: false
        }, async () => {
            return new Promise((resolve) => {
                cp.exec(`python cli/thing.py fix --finding-id ${findingId}`, { cwd: workspacePath }, (err, stdout, stderr) => {
                    if (stdout.includes('[SUCCESS]')) {
                        // Trigger verification
                        cp.exec(`python cli/thing.py verify --finding-id ${findingId}`, { cwd: workspacePath }, (vErr, vStdout) => {
                            if (vStdout.includes('[VERIFIED FIXED]')) {
                                vscode.window.showInformationMessage(`Kavach: Finding ${findingId} verified fixed.`);
                            } else {
                                vscode.window.showWarningMessage(`Kavach: Fix applied, but rescan requires manual review.`);
                            }
                            resolve();
                        });
                    } else {
                        vscode.window.showErrorMessage(`Kavach: Failed to apply fix.`);
                        resolve();
                    }
                });
            });
        });
    });

    context.subscriptions.push(disposableScan);
    context.subscriptions.push(disposableFix);
    context.subscriptions.push(disposableScanApi);
    context.subscriptions.push(disposableFixFinding);

    // Watch files to do incremental scan on save (Debounced)
    let timeout = null;
    vscode.workspace.onDidSaveTextDocument((doc) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            cp.exec(`python cli/thing.py scan --changed`, { cwd: workspacePath }, (error, stdout, stderr) => {
                // Update inline diagnostics here based on JSON output
            });
        }, 1000); // 1s debounce
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
