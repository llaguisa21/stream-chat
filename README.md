# AI Debate: OpenAI vs Gemini

This project is a web application that enables real-time AI-driven debates between OpenAI and Gemini. It allows users to choose a topic and initiate a debate where OpenAI (supporting the topic) and Gemini (opposing the topic) present their viewpoints in real-time.

## Features

- **Real-Time Debate**: OpenAI and Gemini argue about a chosen topic in real-time using event streaming.
- **Dynamic Interaction**: Users can start or stop debates through a simple interface.
- **Responsive Design**: Optimized for different screen sizes.

## Technologies Used

- **Node.js**: Backend server to manage debate logic and events.
- **Express**: Web framework to handle routing and HTTP requests.
- **OpenAI API**: AI model for generating debate arguments in favor of the topic.
- **Google Gemini API**: AI model for generating opposing debate arguments.
- **EJS**: Template engine for dynamic HTML rendering.
- **CSS**: Styling for the web interface.

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/your-repository-name.git
    ```
2. Navigate to the project directory:
    ```bash
    cd your-repository-name
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Create a `.env` file with the following keys:
    - `GEMINI_API_KEY`: Your Gemini API key.
    - `OPENAI_API_KEY`: Your OpenAI API key.
5. Run the application:
    ```bash
    npm start
    ```

The application will be running on `http://localhost:3000`.

## Usage

- Start a debate by entering a topic and clicking "Start Debate".
- Watch as OpenAI and Gemini take turns presenting their arguments.
- Stop the debate anytime by clicking "Stop Debate".


## Acknowledgments

- OpenAI for providing the GPT-4 model.
- Google Gemini for providing the Gemini model.
