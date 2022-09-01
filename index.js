//checks if document is loaded
function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

jQuery(function ($) {
	console.log("main running")
	submitDummyShip();
	var coll = document.getElementsByClassName("collapsebutton");
	var i;

	for (i = 0; i < coll.length; i++) {
		coll[i].addEventListener("click", function () {
			this.classList.toggle("active");
			var content = this.nextElementSibling;
			if (content.style.display === "block") {
				content.style.display = "none";
			} else {
				content.style.display = "block";
			}
		})


	}
})




var count = 2;
//adds a shipcard to main
function addShipCard(ship){
console.log("function ran");
count++;

let shipCards = document.getElementById("ships")
let newShipCard = document.createElement("article");
let img = document.createElement("img");
let desc = document.createElement("p")
let name = document.createElement("p")
let nameNode = document.createTextNode(ship.name);
let descNode = document.createTextNode(ship.desc);
img.src = ship.image;
img.classList.add("shipimg");
img.width=150;
img.height=250;
name.appendChild(nameNode);
desc.appendChild(descNode);

newShipCard.append(name,img,desc);

newShipCard.classList.add("ship");

shipCards.appendChild(newShipCard);



}



function Ship(shipeycode){
	this.name ="untitled"
	this.desc = "no description"
	this.image="http://placekitten.com/g/200/300"
	this.shipeycode = shipeycode;
	


}
var unloadedShips = [];
var loadedships = [];
function submitNewShip(){
	let shipName = document.getElementById("shipNameInput").value;
	let shipDesc = document.getElementById("shipDescInput").value;
	let shipCode = document.getElementById("shipeyInput").value;
	
	let newShip = new Ship(shipCode);
	newShip.Name = shipName;
	newShip.desc = shipDesc;
	
	unloadedShips.push(newShip);
}



//for testing
var count = 0;
function submitDummyShip(){
	let shipName = "uwuShip #"+count;
	let shipDesc = " sdklhfdskjfg sjvhfsjadkf dslfhvjakdsvbnsjkdfh dkjsb lbsakdljbvdskajcv dfsvkjhdasfkadsnbfskj,b sdk jgsdvlkbsh kasjdhcakjh sdskjadg ashfuwu"+count;
	let shipCode ="123";
	let newShip = new Ship(shipCode);
	newShip.name = shipName;
	newShip.desc = shipDesc;
	unloadedShips.push(newShip);
	count++;
}






function loadUnloadedShips(unloadedShipsArray,loadedShipsArray){
	if(unloadedShipsArray.length < 0){
	console.log("All ships loaded")	;
	
	
} else {
	let lastShip = unloadedShipsArray.pop();
addShipCard(lastShip);
loadedShipsArray.push(lastShip);
loadUnloadedShips(unloadedShipsArray,loadedShipsArray);
}
}

//stuff to do when document loaded
/*

function main() {

console.log("main running")
var coll = document.getElementsByClassName("collapsebutton");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  })
}


const button = document.getElementById("shipSubmitInput");

}
*/









docReady(function(){
	console.log("cockready")
});


