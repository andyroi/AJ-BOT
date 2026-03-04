from flask import Flask, request, jsonify #flask used to build a web server in Python
from flask_cors import CORS # lets frontend and backend communicate with each other
import os # for environment variables
from google import genai # import the google genai library to talk to google's gemini models
from google.genai import types # import types for structured content (roles, parts)

app = Flask(__name__) # create the flask app (my server)

CORS(app) # turn on CORS so other apps (Like React) cam call this server - now HTML/JS file can send requests to http://localhost:5000

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY")) # create a client to talk to google's gemini models, using the API key stored in the environment variable GOOGLE_API_KEY 

# ── Load system prompt from CLAUDE.md ────────────────────────
# Reads the AJ Bot personality / instructions file once at startup
prompt_path = os.path.join(os.path.dirname(__file__), "CLAUDE.md")
with open(prompt_path, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

# ── Conversation history (in-memory, per server session) ─────
# Stores the running list of user/model messages so the AI remembers context
conversation_history = []

@app.route("/chat", methods=["POST"]) # creates a route/endpoint that'll handle POST requests to /chat 
#POST mainly used for sending data like a message to the server
def chat(): #will run everytime someone calls https://localhost:5000/chat with a POST request
    data = request.json #automatically converts JSON data into python dictionary
    user_message = data.get('message', '') #get the message from the user that was sent in the POST request

    if not user_message: #if empty
        return jsonify({"error": "No message provided"}), 400 #if no message was sent, return an error response and 400 HTTP status code for bad request
    
    # Append the user's message to conversation history
    conversation_history.append(
        types.Content(role="user", parts=[types.Part.from_text(text=user_message)])
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", #which model to use
            contents=conversation_history, #send the FULL conversation so the AI has context of previous messages
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT # the AJ Bot personality & rules from CLAUDE.md
            )
        )

        ai_text = response.text

        # Append the AI's reply to conversation history so it remembers its own answers too
        conversation_history.append(
            types.Content(role="model", parts=[types.Part.from_text(text=ai_text)])
        )

        print(ai_text)
        return jsonify({"response": ai_text}) #take the response from the model and send it back to the frontend as JSON  
    except Exception as e:
        return jsonify({"error": str(e)}), 500 #if something goes wrong with the API call, return an error response with the error message and a 500 HTTP status code for server error

@app.route("/reset", methods=["POST"]) # endpoint to clear conversation history and start fresh
def reset():
    conversation_history.clear()
    return jsonify({"status": "Conversation history cleared"})
    
if __name__ == "__main__": #only run when excute "API.py" directly, not when imported as a module
    app.run(debug=True, port = 5000) #start the flask server in debug mode (auto restarts when code changes and provides error messages in the browser)
    # port = 5000 server will run at http://localhost:5000