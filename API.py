from flask import Flask, request, jsonify #flask used to build a web server in Python
from flask_cors import CORS # lets frontend and backend communicate with each other
import os # for environment variables
from google import genai # import the google genai library to talk to google's gemini models

app = Flask(__name__) # create the flask app (my server)

CORS(app) # turn on CORS so other apps (Like React) cam call this server - now HTML/JS file can send requests to http://localhost:5000

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY")) # create a client to talk to google's gemini models, using the API key stored in the environment variable GOOGLE_API_KEY 

@app.route("/chat", methods=["POST"]) # creates a route/endpoint that'll handle POST requests to /chat 
#POST mainly used for sending data like a message t othe server
def chat(): #will run everytime someone calls https://localhost:5000/chat with a POST request
    data = request.json #automatically converts JSON data into python dictionary
    user_message = data.get('message', '') #get the message from the user that was sent in the POST request

    if not user_message: #if empty
        return jsonify({"error": "No message provided"}), 400 #if no message was sent, return an error response and 400 HTTP status code for bad request
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", #which model to use
            contents=user_message #the message from the user is sent as the "contents" to the model
        )
        print(response.text)
        return jsonify({"response": response.text}) #take the response from the model and send it back to the frontend as JSON  
    except Exception as e:
        return jsonify({"error": str(e)}), 500 #if something goes wrong with the API call, return an error response with the error message and a 500 HTTP status code for server error
    
if __name__ == "__main__": #only run when excute "API.py" directly, not when imported as a module
    app.run(debug=True, port = 5000) #start the flask server in debug mode (auto restarts when code changes and provides error messages in the browser)
    # port = 5000 server will run at http://localhost:5000