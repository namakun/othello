# Othello Game Requirements (Serverless Environment with DynamoDB)

## Basic Features
- **Browser-Based Player vs CPU Game:**  
  A web-based Othello game where a human player competes against the computer.
- **Game Rules Implementation:**
  - **Board Setup:** An 8x8 board is displayed with the initial four pieces arranged in the center (with the top-left piece being white).
  - **Player Color:** The player can choose their color or have it randomly assigned.
  - **Turn Order:** Black always goes first, followed by white.
  - **Turn Progression:** Each turn advances upon placing a piece.
  - **Flipping Mechanism:** The opponent’s pieces are flipped when they are bracketed.
  - **Valid Moves:** A move is allowed only if there is at least one valid placement.
  - **Forced Pass:** If no valid moves exist, the turn is automatically passed.
  - **Game End:** The game ends when neither player can make a valid move.
  - **Winning Condition:** The player with the most pieces on the board wins.
  - **Result Display & Restart:** The game displays the outcome and provides an option to restart.

## Technical Architecture

### Frontend
- **Technologies:**  
  Vue.js (Plain JavaScript version) is used as the sole frontend framework.
- **Communication:**  
  The frontend uses the Fetch API to interact with the backend API.
- **Hosting & Domain Management:**  
  The frontend can be hosted on GitHub Pages, which provides a free subdomain (username.github.io) to simplify domain management.

### Backend (Serverless Environment)
- **Implementation Language:**  
  Python (using FastAPI or Flask).
- **Serverless Deployment:**
  - **Amazon API Gateway:**  
    Receives HTTP requests from the frontend and routes them to AWS Lambda.
  - **AWS Lambda:**  
    Executes the game logic and AI inference. Based on the request parameter `difficulty` (values: "weak", "normal", "strong"), the Lambda function branches into:
    - **Weak:**  
      Implements a completely random move selection or uses a very simple evaluation function.
    - **Normal:**  
      Applies a basic board evaluation algorithm, such as the minimax method.
    - **Strong:**  
      Utilizes advanced algorithms like minimax with alpha-beta pruning or leverages AI libraries (e.g., TensorFlow, PyTorch, or scikit-learn) for inference.
  - **Amazon DynamoDB:**  
    Used to manage and persist game state.
    - Each match is assigned a unique Match ID.
    - The current board state, turn information, and scores are stored in a DynamoDB table.
    - For every turn, the Lambda function retrieves the latest state from DynamoDB, computes the next move, and updates the state accordingly.
  - **AWS CloudWatch Logs:**  
    Employed for logging, error tracking, and performance monitoring of Lambda functions.
- **Optional:**  
  If advanced AI models are required, Amazon SageMaker endpoints can be integrated and called from Lambda.

### Environment Setup with Docker
- **Containerized Development:**  
  Docker is used for building and managing the development environment.  
  All dependencies and packages are encapsulated in Docker images, ensuring that nothing is installed directly on the local machine.
- **Benefits:**  
  - Consistent environment across different development machines.
  - Simplified dependency management.
  - Easy deployment and scaling in production.

## AI Difficulty Levels
- **Request Parameter:**  
  The frontend includes a `difficulty` parameter in its requests (e.g., "weak", "normal", "strong").
- **Lambda Branching:**  
  Based on the parameter:
  - **Weak:** Uses random or basic evaluation functions.
  - **Normal:** Employs basic board evaluation algorithms (e.g., minimax).
  - **Strong:** Implements advanced board evaluation methods, such as minimax with alpha-beta pruning or AI-based inference using relevant libraries.

## Game State Management with DynamoDB
- **Purpose:**  
  Since AWS Lambda is stateless, DynamoDB is used to persist game state (board, turn, scores, etc.) throughout a match.
- **Implementation:**
  - A unique Match ID is generated at the start of each game.
  - The board state and player information are stored in a DynamoDB table keyed by the Match ID.
  - On each turn, the Lambda function retrieves the current state, computes the next move, and writes the updated state back to DynamoDB.

## Deployment Overview
- **Frontend:**  
  Hosted on GitHub Pages, reducing the overhead of domain management.
- **Backend:**  
  Deployed as a serverless solution on AWS using Amazon API Gateway, AWS Lambda, Amazon DynamoDB, and CloudWatch Logs.
