import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { compileJavaScript } from './compilers/javascript';
import { compileC } from './compilers/c';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Mini Compiler API</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; }
          h2 { color: #555; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Mini Compiler API</h1>
        <p>This is the API server for the Mini Compiler application.</p>
        
        <h2>Available Endpoints:</h2>
        <ul>
          <li><strong>POST /api/compile/javascript</strong> - Compile JavaScript code</li>
          <li><strong>POST /api/compile/c</strong> - Compile C code</li>
        </ul>
        
        <h2>JavaScript Example:</h2>
        <pre>
POST /api/compile/javascript
Content-Type: application/json

{
  "code": "function sayHello() { console.log('Hello, world!'); } sayHello();"
}
        </pre>
        
        <h2>C Example:</h2>
        <pre>
POST /api/compile/c
Content-Type: application/json

{
  "code": "#include <stdio.h>\\nint main() { printf(\\"Hello, world!\\"); return 0; }"
}
        </pre>
        
        <p>Access the frontend at <a href="http://localhost:3000">http://localhost:3000</a></p>
      </body>
    </html>
  `);
});

// Routes
app.post('/api/compile/javascript', function(req, res) {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  compileJavaScript(code)
    .then(result => {
      return res.json(result);
    })
    .catch(error => {
      return res.status(500).json({ 
        error: error.message || 'An error occurred during compilation' 
      });
    });
});

app.post('/api/compile/c', function(req, res) {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  compileC(code)
    .then(result => {
      return res.json(result);
    })
    .catch(error => {
      return res.status(500).json({ 
        error: error.message || 'An error occurred during compilation' 
      });
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 