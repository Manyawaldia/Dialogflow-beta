const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";
let messageId = 0

const categories = ["hats", "bottoms", "tees", "sweatshirts", "plushes", "leggings"];

const items = [
  { name: "Wisconsin Football Hat", id: 10 },
  { name: "White Wisconsin Visor", id: 11 },
  { name: "150 Year Commemorative Hoodie", id: 13 },
  { name: "Bucky Crew Neck Sweatshirt", id: 1 },
  { name: "Jump Around Shirt", id: 12 },
  { name: "Bucky Badger Plush", id: 3 },
  { name: "Game Day Bucky Plush", id: 5 },
  { name: "W Cloud Pillow", id: 7 },
  { name: "Bucky Badger Pillow", id: 8 },
  { name: "Bucky Badger Keychain", id: 9 },
  { name: "Wisconsin Leggings", id: 4 },
  { name: "Bucky Badger Leggings", id: 6 },
  { name: "Women's Wisconsin Cuddle Joggers", id: 14 },
  { name: "Wisconsin Qualifier Woven Short", id: 16 },
  { name: "Wisconsin Running Shorts", id: 17 },
  { name: "Wisconsin Sweatpants", id: 15 }
]

let tags = ['logo', 'printed',
  'cotton', 'polyester',
  'shortsleeve', 'longsleeve',
  'shorts', 'pants',
  'sweats', 'hoodies',
  'grey', 'youth',
  'adult', 'embroidered',
  'black', 'fuzzy',
  'badger', 'pillow',
  'keychain', 'visor']

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000"
} else {
  ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}


async function allProds() {

  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    },
  }

  const ret = await fetch(ENDPOINT_URL + '/products', request)
  const res = await ret.json()

  return res

}

async function allTags() {

  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    },
  }

  const ret = await fetch(ENDPOINT_URL + '/tags', request)
  const res = await ret.json()
  // console.log(serverResponse)
  tags = res

}

async function getToken() {
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password)
    },
    redirect: 'follow'
  }

  const ret = await fetch(ENDPOINT_URL + '/login', request)
  const res = await ret.json()

  return res.token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  function welcome() {
    agent.add('Webhook works!')
    console.log(ENDPOINT_URL)
  }
  async function showMessage(date, isUser, text) {
    messageId += 1;

    let request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        id: messageId,
        date: date.toString(),
        isUser: isUser,
        text: text
      })
    }
    await fetch(ENDPOINT_URL + '/application/messages', request)
  }

  async function clearMessages() {
    let request = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      }
    }
    await fetch(ENDPOINT_URL + '/application/messages', request)
  }
  // 


  async function login() {
    // console.log("hi")

    await clearMessages()

    messageId = 0
    username = agent.parameters.username
    password = agent.parameters.password

    token = await getToken()

    if (token !== undefined) {
      isLoggedIn = true;
      agent.add("You've successfully logged in, " + username + "!")
      showMessage(new Date(), false, "You've successfully logged in, " + username + "!")

      // Clear the old messages
      clearMessages()
    } else {
      showMessage(new Date(), false, "Incorrect username or password, try again.")
      agent.add("Incorrect username or password, try again.")
    }

  }

  /** goes to the category */
  async function home() {

    await showMessage(Date, true, agent.query);
    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        back: false,
        dialogFlowUpdate: true,
        page: "/" + username
      })
    }

    const serverReturn = await fetch(ENDPOINT_URL + '/application', request)
    const serverResponse = await serverReturn.json()

    let success = "Redirecting to homepage";
    let error = "Sorry there was an error please re-enter a category"
    console.log(serverResponse.message)
    if (serverResponse.message === "Application state modified!") {
      agent.add(success);
      await showMessage(Date(), false, success);
    }
    else {
      agent.add(error)
      await showMessage(Date(), false, error)
    }
  }


  /** goes to the category */
  async function queryCategory() {

    await showMessage(Date, true, agent.query);
    let category = agent.parameters.category;

    let request = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        back: false,
        dialogFlowUpdate: true,
        page: "/" + username + "/" + category
      })
    }

    const ret = await fetch(ENDPOINT_URL + '/application', request)
    const res = await ret.json()

    let success = "Redirecting to " + category + " page";
    let error = "Sorry there was an error please re-enter a category"
    console.log(res.message)
    if (res.message === "Application state modified!") {
      agent.add(success);
      await showMessage(Date(), false, success);
    }
    else {
      agent.add(error)
      await showMessage(Date(), false, error)
    }

  }

  async function showAllTags() {
    await showMessage(Date(), true, agent.query);
    let msg = "Showing all available tags: ";  
    agent.add(msg);
    msg += tags.join(", ")
    // console.log(msg)
    await showMessage(Date(), false, msg);

  }

  /** Show reviews for a product */
  async function itemQuery() {
    let pID = 0
    let name = ""
    await showMessage(Date, true, agent.query);

    let product = agent.parameters.Object;
    items.forEach((element) => {
      if (element.name === product) {
        pID = element.id;
        name = element.name
      }
    });

    let request = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      }
    }

    const ret = await fetch(ENDPOINT_URL + '/products/' + pID + "/reviews", request)

    const res = await ret.json()

    console.log(res)
    // let success = "Redirecting to " + name + " page. Scroll for full information on reviews";
    let error = "Sorry there was an error please try again"
    let msg = []
    let str = ''
    if (res.reviews !== undefined) {
      res.reviews.forEach((element) => {
        str = element.text + " " + element.stars + " star(s)"
        msg.push(str.toString())

      });
      console.log(msg)
      await showMessage(Date(), false, "Following are the reviews: ")
      for (var i = 0; i < msg.length; i++) {

        agent.add(msg[i])
        await showMessage(Date(), false, msg[i]);
      }

    }
    else {
      agent.add(error)
      await showMessage(Date(), false, error)
    }

  }


  async function whatCategories() {

    await showMessage(Date(), true, agent.query);
    let cats = "Showing all available categories: ";
    agent.add(cats);
    let msg = cats + categories.join(", ")
    await showMessage(Date(), false, msg);

  }


  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('Login', login)
  intentMap.set('Home', home)
  intentMap.set('WelcomeWisc', welcome)
  intentMap.set('Category Query', queryCategory)
  intentMap.set('query about categories', whatCategories)
  intentMap.set('Product Info', itemQuery)
  intentMap.set('all tags', showAllTags)

  agent.handleRequest(intentMap)

})


app.listen(process.env.PORT || 8080)
