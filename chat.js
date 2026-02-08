const chatBox = document.getElementById('chat-box'); //document.get find the HTML element with id="chat-box"
const inputBox = document.getElementById('input-box'); //document.get find the HTML element with id="input-box"
const sendBtn = document.getElementById('send-btn'); //document.get find the HTML element with id="send-btn"

async function sendMessage() { //main function sends message to backend and display response
//async means function can wait for things like API responses without freezing page
    //USER RESPONSE
    const message = inputBox.value.trim(); //grabbing user value from whatever text is in input field
    if (!message) return; //if empty do nothing and exit function

    chatBox.innerHTML += `<p class = "user"><strong>You:</strong> ${message}</p>`; //see the user text via chatbox
    inputBox.value = ''; //clear so user can type a new message

    //AI RESPONSE
    const response = await fetch('http://localhost:5000/chat', { //'await' - pause til server reponse, 'fetch' - makes http request to make backend, localhost is URL of flask /chat endpoint
        method: 'POST', //POST means sending data TO the server
        headers: {'Content-Type': 'application/json'}, //headers tel lthe server what kind of data we're sending and 'applicatyion/json'sending via JSON format
        body: JSON.stringify({message}) //body is what we're sending, JSON.stringify - convert JavaScript object to JSON format
    }); //should contain the server's reply in 'response'

    const data = await response.json() // convert the server's JSON response into javascript obj, await - waits for conversion to finish
    // 'data' is now javascript obj like {response: "AI's answer"}

    chatBox.innerHTML += `<p class="ai"><strong>AI:</strong> ${data.response}</p>`; //AI response into the chatBox
    chatBox.ScrollTop = chatBox.scrollHeight; //auto scroll
    // scrollTop controls scroll position
    // scrollHeight is the total height of all content
    // Setting scrollTop = scrollHeight scrolls all the way down
}

sendBtn.addEventListener('click', sendMessage); //addeventListener waits for the event like click to happen and when even fires the "sendMessage" function will occur
inputBox.addEventListener('keypress', (e) => { //checks if the user presses "Enter" then calls the sendMessage function
    if (e.key == 'Enter') sendMessage();
});
