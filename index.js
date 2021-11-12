var count = 2;

function addShipCard(){
console.log("function ran");
count++;

let shipCards = document.getElementById("ships")
let newShipCard = document.createElement("article");
let img = document.createElement("img");
let text = document.createElement("p")
let textNode = document.createTextNode("ship"+count);
img.src = "http://placekitten.com/g/200/300";
img.width=150;
img.height=250;

text.appendChild(textNode);

newShipCard.append(img,text);

newShipCard.classList.add("ship");

shipCards.appendChild(newShipCard);

}

//function main(){

const button = document.getElementById("uploadButton");
button.addEventListener(click,addShipCard());

//}


function docReady() {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
} 

docReady(main());


/*
if(button){
	console.log("document exists uwu")
	button.addEventListener(click,addShipCard());
};
*/