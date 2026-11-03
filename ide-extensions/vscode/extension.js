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

    context.subscriptions.push(disposableScan);
    context.subscriptions.push(disposableFix);

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
