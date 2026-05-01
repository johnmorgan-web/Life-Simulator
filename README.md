# Life-Simulator

Application for testing math skills with real world examples

## Overview
- Client: Vite in the `client/` folder.
- Server: NestJS in the `server/` folder.
- The client `npm run start` script uses `concurrently` to start both client (Vite) and server (Nest) for development.

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
4. Open the Vite dev server in your browser (default port `5173`) and the API at `http://localhost:3000`.

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

## Docker deployment

The repository includes a production Docker build that compiles the Vite client, bundles it into the Nest server image, and exposes a single runtime port on `3000`.

Build locally:

```bash
docker build -t life-simulator .
docker run --rm -p 3000:3000 -v life-simulator-data:/app/data life-simulator
```

The container serves:
- the React app from `/`
- the existing API from `/users/*` and `/game/*`

## GitHub Actions image pipeline

The workflow at `.github/workflows/docker-image.yml` builds and pushes the image to GitHub Container Registry (`ghcr.io`) on pushes to `main` and on manual runs.

Expected image name:

```text
ghcr.io/<owner>/<repo>:latest
```

To let a RackNerd VPS run the image:

1. Install Docker and Docker Compose on the VPS.
2. Copy `docker-compose.prod.yml` to the VPS.
3. Replace `ghcr.io/OWNER/REPO:latest` with your actual image.
4. Log in to GHCR on the VPS with a GitHub token that has `read:packages`.
5. Run `docker compose -f docker-compose.prod.yml up -d`.

Example GHCR login:

```bash
echo <github-token> | docker login ghcr.io -u <github-username> --password-stdin
```

If the VPS should only be reached through a reverse proxy, keep the container on port `3000` internally and publish it behind Nginx or Caddy.

## Notes
- Development still uses Vite on `5173` talking to the Nest server on `3000`.
- Production defaults to same-origin API calls, so the bundled frontend works without setting `VITE_API_URL`.
- Set `CORS_ORIGINS` if you need cross-origin browser access in production.
