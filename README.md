# Othello Game

A browser-based Othello (Reversi) game implemented with Vue.js. This project allows players to play against the computer with different difficulty levels or against another local player.

## Features

- 8x8 game board with standard Othello rules
- Multiple game modes:
  - Offline match (human vs human)
  - CPU opponent with three difficulty levels (weak, normal, strong)
- Visual indication of valid moves
- Turn system with pass handling
- Score tracking and game end detection
- Responsive design

## Development Setup

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Docker and Docker Compose (optional, for containerized development)

### Local Development

1. Clone the repository:
```
git clone https://github.com/[username]/othello.git
cd othello
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run serve
```

4. Open your browser and navigate to `http://localhost:8080`

### Using Docker

1. Build and start the container:
```
docker compose up -d
```

2. Access the application at `http://localhost:8080`

3. Stop the container when finished:
```
docker compose down
```

## Deployment

### GitHub Pages

This project is configured for easy deployment to GitHub Pages.

#### Automatic Deployment (Recommended)

1. Push changes to the main branch
2. GitHub Actions will automatically build and deploy to the gh-pages branch
3. The game will be available at `https://[username].github.io/othello/`

#### Manual Deployment

1. Update the repository URL in `deploy.sh` with your actual GitHub repository
2. Run the deployment script:
```
./deploy.sh
```
3. The game will be available at `https://[username].github.io/othello/`

## License

This project is licensed under the MIT License - see the LICENSE file for details.
