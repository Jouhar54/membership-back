import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(process.cwd(), 'src'));
files.push(path.join(process.cwd(), 'app.js'));
files.push(path.join(process.cwd(), 'server.js'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace const { a, b } = require('foo') with import { a, b } from 'foo'
    content = content.replace(/(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\((['"])(.*?)\2\);?/g, (match, vars, quote, p1) => {
        let importPath = p1;
        if (importPath.startsWith('.')) {
            if (!importPath.endsWith('.js')) importPath += '.js';
        }
        return `import { ${vars.trim()} } from '${importPath}';`;
    });

    // Replace const a = require('foo') with import a from 'foo'
    content = content.replace(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*require\((['"])(.*?)\2\);?/g, (match, varName, quote, p1) => {
        let importPath = p1;
        if (importPath.startsWith('.')) {
            if (!importPath.endsWith('.js')) importPath += '.js';
        }
        return `import ${varName} from '${importPath}';`;
    });

    // Replace require('dotenv').config() with import dotenv from 'dotenv'; dotenv.config();
    if (content.includes("require('dotenv').config()")) {
        content = content.replace(/require\('dotenv'\)\.config\(\);?/, "import dotenv from 'dotenv';\ndotenv.config();");
    }

    // Replace module.exports = { a, b } with export { a, b }
    content = content.replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };');
    
    // Replace module.exports = foo with export default foo
    content = content.replace(/module\.exports\s*=\s*([a-zA-Z0-9_]+);?/g, 'export default $1;');

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Conversion done.');
