# Life-Simulator

Application for testing math skills with real world examples

## Overview
- Client: Vite (modern frontend dev server / bundler) in the `client/` folder.  
- Server: Express (Node.js) in the `server/` folder.  
- The client `npm run start` script uses `concurrently` to start both client (Vite) and server (Express) for development.

## Quick start
1. Install Node.js (12+ / 14+ recommended) and npm.
2. From the repository, go to into **both** client/server and install dependencies
  ```bash
  cd <name>
  npm install
  ```
3. Start both server and client (the `start` script in `client` uses `concurrently`):
  ```bash
  npm run start
  ```
4. Open the Vite dev server in your browser (default Vite port is usually `5173`) and the Express API (commonly `http://localhost:3000`).

## Run parts independently
- Run only the server:
  ```bash
  cd server
  npm install
  npm run start
  ```
- Run only the client (Vite dev server):
  ```bash
  cd client
  npm install
  npm run dev
  ```

## Example client/package.json `start` script
If you need an example of how the client can start both processes with `concurrently`:
```json
"scripts": {
  "dev": "vite",
  "start": "concurrently \"npm --prefix ../server run start\" \"npm run dev\""
}
```

## Notes
- Adjust ports and scripts to match your actual server/client setup.
- Ensure `concurrently` is installed as a dependency in `client` if you use the example script:
  ```bash
  cd client
  npm install concurrently --save-dev
  ```
