import { initializeApp } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, query, orderBy,limit,startAt,startAfter,where } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-firestore.js";
//const Canvas = require('canvas');
//const parts = require('./parts.json');
//const {size, mappings} = require('./atlas.json'), atlasSize = size;
//const atob = require('atob');
//
import parts from './parts.js'
import atlasjson from './atlas.js'
const NxN = 16;
const SIZE = 20;
const MARGIN = 80;
const LIMIT = 6;

const mappings = atlasjson.mappings;
const size = atlasjson.size;
var atlasSize = size;


var atlas = null;
const Canvas = document.getElementById("shipeycanvas");
//Canvas.loadImage("atlas.png").then((image) => atlas = image);
atlas = new Image()
atlas.src = './atlas.png'





//extractpart 



/*
JSON.stringify(Object.fromEntries(
    Object.entries(parts).map(([name, ctor]) => {
        const part = new ctor();
        const obj = {};
        for(const k in part) {
            if(
                typeof part[k] !== 'function' &&
                !['pos', 'worldPos', 'rot', 'dir', 'desc'].includes(k)
            ) {
                obj[k] = part[k];
            }
        }
        return [name, obj];
    })
));
*/




//isdecal
var isDecal = (name) => {
    return name.includes("Decal") || name.includes("Letter") || name.includes("Stripe");
};


//getstats
var getStats = (spec) => {
    let stats = {
        hp: 5,
        cost: 0,
        mass: 0,
        thrust: 0,
        turnSpeed: 1,
        genEnergy: 2.5,
        storeEnergy: 0,
        shield: 0,
        genShield: 0,
        jumpCount: 0,
        center: [0, 0],
        radius: 0,
        //dps: 0,
        //damage: 0,
        //range: 0,
        moveEnergy: 0,
        //fireEnergy: 0,
        otherEnergy: 0,
        allEnergy: 0,
        weapons: [],
        //ais: []
    };

    let ix = 0;
    let iy = 0;
    let totalArea = 0;
    for(let p of spec.parts) {
        let data = parts[p.type];
        if(!data) continue;

        for(let j in stats) {
            if(data[j]) {
                stats[j] += data[j];
            }
        }

        if(p.type.startsWith("Engine"))
            stats.moveEnergy += data.useEnergy;
        else if(data.damage && !data.explodes) { // Is a weapon
            stats.weapons.push({
                type: p.type,
                name: parts[p.type].name,
                pos: p.pos,
                damage: data.damage,
                dps: 0,
                energyDamage: data.energyDamage,
                range: data.range,
                reloadTime: data.reloadTime,
                bulletSpeed: data.bulletSpeed,
                shotEnergy: data.shotEnergy,
                fireEnergy: 0,
                weaponRange: data.weaponRange,
                weaponRangeFlat: data.weaponRangeFlat,
                weaponDamage: data.weaponDamage,
                weaponSpeed: data.weaponSpeed,
                weaponReload: data.weaponReload,
                weaponEnergy: data.weaponEnergy
            });
        } else if(data.useEnergy) {
            stats.otherEnergy += data.useEnergy;
        }

        if(data.mass > 0 && !data.weapon) {
            let partArea = data.size[0] * data.size[1];
            ix += partArea * p.pos[0];
            iy += partArea * p.pos[1];
            totalArea += partArea;
        }
    }

    if(totalArea > 0) {
        stats.center = [ix / totalArea, iy / totalArea];
    }

    stats.radius = 0;
    for(let part of spec.parts) {
        let r = Math.sqrt((part.pos[0] - stats.center[0])**2 + (part.pos[1] - stats.center[1])**2);
        if(r > stats.radius && !isDecal(part.type)) {
            stats.radius = r;
        }
    }
    if(stats.radius > 500)
        stats.radius = 500;

    for(let p of spec.parts) {
        let data = parts[p.type];
        if(!data) continue;

        let ws = [];
        if(p.type.endsWith("Mod"))
            ws = stats.weapons.filter(w => Math.sqrt((p.pos[0] - w.pos[0])**2 + (p.pos[1] - w.pos[1])**2) < 45);
        else if(p.type.startsWith("Mount"))
            ws = stats.weapons.filter(w => Math.sqrt((p.pos[0] - w.pos[0])**2 + (p.pos[1] - w.pos[1])**2) < 20);

        let effect = (1/0.85) * (0.85 ** ws.length);
        for(let w of ws) {
            w.weaponRange *= 1 + (data.weaponRange || 0) / 100 * effect;
            w.weaponRangeFlat += (data.weaponRangeFlat || 0) * effect;
            w.weaponDamage *= 1 + (data.weaponDamage || 0) / 100 * effect;
            w.weaponSpeed += (data.weaponSpeed || 0) / 100 * effect;
            w.weaponReload *= 1 + (data.weaponReload || 0) / 100 * effect;
            w.weaponEnergy *= 1 + (data.weaponEnergy || 0) / 100 * effect;

            if(p.type.startsWith("Mount")) {
                w.mount = parts[p.type].name;
                w.arc = parts[p.type].arc;
            }
        }
    }

    stats.dps = 0;
    stats.damage = 0;
    stats.range = 0;
    stats.fireEnergy = 0;

    for(let w of stats.weapons) {

        w.range *= w.weaponRange;
        w.range += w.weaponRangeFlat;
        w.damage *= w.weaponDamage;
        w.energyDamage *= w.weaponDamage;
        w.bulletSpeed *= w.weaponSpeed;
        w.reloadTime *= w.weaponReload;
        w.shotEnergy *= w.weaponEnergy;

        w.reloadTime = Math.ceil(w.reloadTime) / 16
        w.bulletSpeed *= 16

        w.fireEnergy = w.shotEnergy / w.reloadTime
        w.dps = w.damage / w.reloadTime

        stats.dps += w.dps;
        stats.damage += w.damage;
        stats.range = Math.max(w.range, stats.range);
        stats.fireEnergy += w.fireEnergy;
    }

    stats.speed = (stats.thrust / stats.mass * 9 * 16);
    stats.jumpDistance = (Math.min(1, 41 * stats.jumpCount / stats.mass) * 600);
    stats.turnSpeed = stats.turnSpeed / stats.mass * 16 * 180 / Math.PI;
    stats.genEnergy *= 16;
    stats.genShield *= 16;
    stats.name = spec.name;
    stats.moveEnergy *= 16;
    stats.otherEnergy *= 16;
    stats.allEnergy = stats.fireEnergy + stats.moveEnergy;// + stats.otherEnergy;

    let buildRules = [
        "Field # at start",
        "Field # at priority #",
        "Try to field # every # seconds",
        "Field # for # of enemy @unitTypes at priority #",
        "Field # for # of ship in slot # at priority #",
        "Field # for # of @needTypes at priority #",
        "Field # when money over # at priority #",
    ];
    stats.ais = [];
    for(let ais of spec.aiRules) {
        if(!ais) continue;
        if(!buildRules.includes(ais[0])) {
            stats.ais.push(ais);
        }
    }
    for(let ais of spec.aiRules) {
        if(!ais) continue;
        if(buildRules.includes(ais[0])) {
            stats.ais.push(ais);
        }
    }

    return stats;
}

var drawImage = (ctx, file, x, y, w = SIZE, h = SIZE, dir = 0, flip = false, color, colorMode) => {
    if(!atlas) {
        //console.log("Not ready");
        return;
    }

    let img = getImage(file, flip, color, colorMode);

    if(img != null) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(-dir * Math.PI / 2);
        ctx.translate(-x - w / 2, -y - h / 2);

        ctx.drawImage(img, x, y, w, h);

        ctx.restore();
    }
}

var drawPart = (ctx, name, x, y, dir, color) => {
    if(!parts[name]) {
        //console.log("Unknown part", name);
        return;
    }
//console.log("known part", name);
    var file = "parts/" + parts[name].image;
    var size = parts[name].size;
//console.log(file)
    let wt = size[0] * SIZE;
    let ht = size[1] * SIZE;
    if(name.includes("Turret") || name.includes("Gun")) {
        wt *= 2.3;
        ht *= 2.3;
    }

    let xt = NxN / 2 * SIZE + x - wt / 2;
    let yt = NxN / 2 * SIZE - y - ht / 2;
    let flip = x < 0 && parts[name].flip;

    if(parts[name].northWest && dir % 2 !== 0)
        file = file.replace("N", "W")

    let mode = null;
    if(isDecal(name))
        mode = "color";
    else if(hasColor(name))
        mode = "replace";

    drawImage(ctx, file, xt, yt, wt, ht, dir, flip, color, mode);

    if(name === "JumpEngine")
        drawImage(ctx, "parts/engineJumpPip.png", xt, yt, wt, ht, -dir * Math.PI / 2, flip);
}

var drawShip = (spec, stats, color = [255, 255, 255, 255]) => {
    //let canvas = Canvas.createCanvas(NxN * SIZE + MARGIN, NxN * SIZE + MARGIN);
    let canvas = Canvas;
    let ctx = canvas.getContext('2d');
    ctx.canvas.width = NxN * SIZE + MARGIN
    ctx.canvas.height = NxN * SIZE + MARGIN

    // Scale canvas when ship's too big
    let maxSize = NxN * SIZE / 2;
    let minSize = NxN * SIZE / 2;
    for(let p of spec.parts) {
        for(let i = 0; i <= 1; i++) {
            let s = Math.abs(p.pos[i]) + parts[p.type].size[i];
            if(s > maxSize) {
                maxSize = s;
            }
        }
    }

    let scale = maxSize / minSize;
    let translation = [(canvas.width * scale - MARGIN) / 2 - minSize, (canvas.height * scale - MARGIN) / 2 - minSize];
    let rect = [0, 0, canvas.width, canvas.height];
    if(scale > 1) {
        rect = [-translation[0], -translation[1], scale * canvas.width, scale * canvas.height];
        ctx.scale(1/scale, 1/scale);
        ctx.translate(...translation);
    }

    ctx.clearRect(...rect);

    ctx.globalCompositeOperation = "source-over";
    //#73C1E2
    ctx.fillStyle = "#73C1E2";
    ctx.fillRect(...rect);

    ctx.translate(MARGIN / 2, MARGIN / 2);
    ctx.globalCompositeOperation = "multiply";
    for(let i = 0; i < NxN; i++) {
        for(let j = 0; j < NxN; j++) {
            let size = SIZE * .8;
            let offset = SIZE * .1;
            drawImage(ctx, "parts/sel1x1.png", i * SIZE + offset, j * SIZE + offset, size, size);
        }
    }

    ctx.globalCompositeOperation = "source-over";

    if(stats.shield > 0) {

        let r = stats.radius;
        if(scale > 1) { // big ship
            for(let part of spec.parts) {
                let d = Math.sqrt((part.pos[0] - stats.center[0])**2 + (part.pos[1] - stats.center[1])**2);
                if(d > r) r = d;
            }
        }

        r += 40;

        let x = NxN / 2 * SIZE + stats.center[0] - r;
        let y = NxN / 2 * SIZE - stats.center[1] - r;
        drawImage(ctx, "img/point02.png", x, y, r * 2, r * 2, 0, false, color, "color");
    }

    for(let part of spec.parts) {
        drawPart(ctx, part.type, part.pos[0], part.pos[1], part.dir, color);
    }

    //require("child_process").spawn("firefox", [canvas.toDataURL()]);
    let image = new Image();
    image.src = canvas.toDataURL();
    //console.log(image)
    return image;
}

var getImage = (file, flip = false, color, colorMode) => {

    if(!mappings[file]) {
        //console.log("not in mappings", file);
        return null;
    }

    let uv = mappings[file].uv;
    let x = uv[0] * atlasSize;
    let y = (1 - uv[1]) * atlasSize;
    let x1 = uv[2] * atlasSize;
    let y1 = (1 - uv[3]) * atlasSize;
    let w = x1 - x;
    let h = y1 - y;

    //let cCanvas = Canvas.createCanvas(w, h);
    let cCanvas = document.getElementById("shipeycanvas2");
    let cCtx = cCanvas.getContext('2d');
    cCtx.canvas.width = w
    cCtx.canvas.height = h 


    if(flip)
        cCtx.setTransform(-1, 0, 0, 1, w, 0);

    cCtx.drawImage(atlas, x, y, w, h, 0, 0, w, h);

    if(color && colorMode) {
        let imageData = cCtx.getImageData(0, 0, w, h);
        let data = imageData.data;
        for(let i = 0; i < data.length; i += 4) {
            // I have no idea what these called so I made the name up
            if(colorMode === "color") {
                data[i] = data[i] * color[0] / 255;
                data[i+1] = data[i+1] * color[1] / 255;
                data[i+2] = data[i+2] * color[2] / 255;
                //data[i+3] = 255;
            } else if(colorMode === "replace") {
                if(data[i+1] === data[i+2] && data[i] > data[i+1]) {
                    let p = data[i] / (data[i] + data[i+1] + data[i+2]);
                    let c = (1-p) * data[i+1];
                    data[i] = p * color[0] + c;
                    data[i+1] = p * color[1] + c;
                    data[i+2] = p * color[2] + c;
                }
            }
        }
        cCtx.putImageData(imageData, 0, 0);
    }
    return cCanvas;
};

var hasColor = (name) => {
    return !!mappings["parts/red-" + parts[name].image];
};

/*
setTimeout(() => {
    let spec = JSON.parse(process.argv[2]);
    drawShip(spec, {shield:0}, [80, 80, 80, 255]);
}, 500);
*/


// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
	apiKey: "AIzaSyBnTaKorGtCRKqSkZLSgDqvkPRCVUwNa_U",
	authDomain: "istrohub.firebaseapp.com",
	projectId: "istrohub",
	storageBucket: "istrohub.appspot.com",
	messagingSenderId: "456398690462",
	appId: "1:456398690462:web:32e0745983d6b8673cc38f"
  };

const app = initializeApp(firebaseConfig);


const db = getFirestore(app);


class Ship{
	constructor(shipeycode){
	this.name ="untitled"
	//this.desc = "no description"
	this.image="http://placekitten.com/g/200/300"
	this.shipeycode = shipeycode;
	this.cost = "0"
	this.dps = "0"
	this.hp = "0"
	this.speed = "0"
	this.turn = "0"
	this.range = "0" 
	}
}
//make one main getships function
//works with pagination
//different arguments for the query
//
var q;
var latestDoc;
var latest = null;
var hide = false;
const shipscol = collection(db, "ships");
//flexible getships function (?);
async function getShips(db, limitNum, sort="default",search=null){
	
	//determine the query 

    //default case
    if(sort=="default" && search==null){
        q = await query(shipscol,limit(limitNum));
    } 
    //search is not null, do search
    else if(search!=null) {
        q = await query(shipscol, limit(limitNum),where('name',"<=",search),where('name','>=',search));
    } 
    //else case; TRUE default case XD
    else {
        console.log("deffered to else case lol");
        q = await query(shipscol,limit(limitNum));
    }
    
    
    
    const shipSnapshot = await getDocs(q)
    console.log(shipSnapshot);
	const shiplist = shipSnapshot.docs.map(doc => doc.data());
	latestDoc = shipSnapshot.docs[shipSnapshot.docs.length-1];
    return shiplist;
}

//flexible pagination function
async function getNextShips(){
    console.log("Latestdoc: {}",latestDoc);
    if(latestDoc != undefined){
    q = await query(shipscol, startAfter(latestDoc),limit(10));
    let newSnapshot = await getDocs(q);
    let nextList = newSnapshot.docs.map(doc => doc.data());
    latestDoc = newSnapshot.docs[newSnapshot.docs.length-1];
    return nextList
    } else {
        if(latestDoc==undefined){
        throw new Error("Latestdoc is undefined");
        } 
    }
}

//search function 
function search(){
    console.log("searching...")
    document.getElementById("ships").innerHTML = ""
    let searchVal = document.getElementById("shipsearchbox").value;
    getShips(db, LIMIT,"default",searchVal).then(Ships =>{
        createShipsArray(Ships);
        shipCardTest();
    });
}

//paginate button logic 
function paginate(){
    try {
    getNextShips().then(nextShips => {
        console.log(nextShips);
        createShipsArray(nextShips);
        shipCardTest();
    })
} catch {
    console.log("no more ships?")
}
}    //tracks number of ships made 
var count = 0;
//tracks number of ship articles on page
var shipCount = 0
var unloadedShips = [];
var loadedShips =  [];
//console.log("cats")
var shipCardTemp = document.getElementsByTagName("template")[0];
//console.log("dogs")

//generates and adds a shipcard to main by creating elements and replacing their data with ship's data

//test lal
function addShipCardByTemplateTest(){
	newShipCard = document.importNode(shipCardTemp,true);
	document.append(newShipCard);
    console.log(shiplist);
	createShipsArray(shiplist);
	shipCardTest();
}

var confirmation = (button,state) =>{
        var classToAdd = "neg";
        let text = document.getElementById("confirmation")
        switch(state){
        case "valid":
            text.innerText = "Ship uploaded!";
            classToAdd = "pos"
        break;
       case "invalid":
            text.innerText= "Invalid shipeycode";
        break;
       default:
            text.innerText = "Error uploading";
        }
        text.classList.add(classToAdd+"-fade-in");
        setTimeout(function(){
            text.classList.remove(classToAdd+"-fade-in")
        },3000)

}



//get a new ship from upload page
function submitNewShip(){
    var valid = true
	let shipName = document.getElementById("shipNameInput").value;
	//let shipDesc = document.getElementById("shipDescInput").value;
	let shipCode = document.getElementById("shipey-Input").value;
	let newShip = new Ship(shipCode);
	newShip.Name = shipName;
	//newShip.desc = shipDesc;
	unloadedShips.push(newShip);
	//add to db
    console.log("button pressed")
    
    try{
        JSON.parse(atob((shipCode.slice(4))))
        console.log("valid")
    } catch (e){
        let confirm = document.getElementById("submitShipInput")
        valid = false;
        console.log("invalid")
        confirmation(confirm,"invalid");
    }

    if (valid){
	try {

		const docRef = addDoc(collection(db, "ships"), {
			name: shipName,
			shipeycode: shipCode
		});
		console.log("Ship added with ID: ", docRef.id);
        console.log("uploaded")
        let confirm = document.getElementById("submitShipInput")
        confirmation(confirm,"valid");

	  } catch (e) {
		console.error("Error adding document: ", e);
        confirmation(confirm,"not-uploaded");
	  }

    }
}

   


    
	  


//for testing
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


function shipCardTest(){
loadUnloadedShips(unloadedShips,loadedShips);
}




function addShipCardByTemplate(ship){
	console.dir(ship)
	//console.log(ship.name)
	var shipCards = document.getElementById("ships")
	var shipCardTemp = document.getElementsByTagName("template")[0];
	//console.log("now im inside ")
	//console.log(shipCardTemp);
	var newShipCard = shipCardTemp.content.cloneNode(true)
	//console.log(newShipCard)
	//lets collapse button work
	var shipTableCollapseTarget="shiptable"+shipCount
	newShipCard.getElementById("shiptable").id = shipTableCollapseTarget
	newShipCard.getElementById("colbutton").setAttribute("data-target","#"+shipTableCollapseTarget)
	newShipCard.getElementById("shipname").innerHTML = ship.name;
	newShipCard.getElementById("shipcost").innerHTML = ship.cost;
	newShipCard.getElementById("shiphp").innerHTML = ship.hp;
	newShipCard.getElementById("shipdps").innerHTML = ship.dps;
	newShipCard.getElementById("shipspeed").innerHTML = ship.speed +"m/s";
	newShipCard.getElementById("shipturn").innerHTML = ship.turn ;
	newShipCard.getElementById("shiprange").innerHTML = ship.range + "m";
	newShipCard.getElementById("shipey").value = ship.shipeycode;
	if(ship.image){
        newShipCard.getElementById("shipimg").src = ship.image.src;
    }

    shipCards.append(newShipCard)
	shipCount++
}

function loadUnloadedShips(unloadedShipsArray,loadedShipsArray){
	if(unloadedShipsArray.length <= 0){
		console.log("All ships loaded")	;
	} 
	else {
		let lastShip = unloadedShipsArray.pop();
		addShipCardByTemplate(lastShip);
		loadedShipsArray.push(lastShip);
	loadUnloadedShips(unloadedShipsArray,loadedShipsArray);
	}
}

//pagination loading implementation
//needs: numOfShips
//OLD CODE
/*
function loadPage(shipsArray,pageNumber,shipsPerPage){
	for(let i = (((pageNumber-1)*shipsPerPage)+1);i<pageNumber*shipsPerPage,i++;)
	{
		//console.log("hei");
		addShipCardByTemplate(shipsArray[i]);
	}
}
*/

//numOfShips = unloadedShipsArray.length;
//shipsPerPage = 30;
//numOfPages = numOfShips/shipsPerPage

function createShipsArray(array){
	for(let i =0;i<array.length;i++){
	let shipName = array[i].name;
	let shipDesc = "";
	let shipCode = array[i].shipeycode;
	let newShip = new Ship(shipCode);
	newShip.name = shipName;
	newShip.desc = shipDesc;
		try {
		var spec = JSON.parse(atob((shipCode.slice(4))));
        console.log("shipey parsed on"+newShip.name)
        var stats = getStats(spec);
        //console.log(stats)
        newShip.name = shipName;
        newShip.cost = stats.cost;
        newShip.hp = stats.hp;
        newShip.dps = +stats.dps.toFixed(2);
        newShip.speed = +stats.speed.toFixed(2);
        newShip.turn = +stats.turnSpeed.toFixed(2);
        newShip.range = +stats.range.toFixed(2);
        newShip.image = drawShip(spec, stats)
       // console.log(newShip);
	    unloadedShips.push(newShip);
		} catch(e) {
			console.log("error parsing shipey on "+newShip.name,e)
          //  console.log(atob(shipCode))
		}
      //  console.log(spec);
    }
}


function preveiwShip(){
   var input = document.getElementById("shipey-Input").value;
    try{
    var spec = JSON.parse(atob((input.slice(4))))
    var stats = getStats(spec);
    console.log("stats gotten")
    document.getElementById("ship-upload-img").src = drawShip(spec,stats).src;
    document.getElementById("shipNameInput").value= stats.name;
    console.log("img loaded")
   } catch(e){
    document.getElementById("ship-upload-img").src = "";
    console.log("error parsing...",e)
   }
}

//document is loaded code 
document.addEventListener('DOMContentLoaded', (event)=>{
    console.log("domcontentloaded")
    //jank code now to serve lololol
    if (document.URL.includes("index.html") || !(document.URL.includes("upload.html"))){
    
    console.log("hey")
        var shipCardTemp = document.getElementsByTagName("template")[0];
    console.log(shipCardTemp);
	//console.log("submittering dummy shipper")
	getShips(db,LIMIT).then(shiplist =>{
	console.log(shiplist);
	createShipsArray(shiplist);
	shipCardTest();
	})
   /document.getElementById("searchButton").addEventListener("click", search,false);
    document.getElementById("add-more-button").addEventListener("click",paginate,false);

    } else if(document.URL.includes("upload.html")){
    console.log("upload.html")
	document.getElementById("submitShipInput").addEventListener("click",submitNewShip,false);
    document.getElementById("shipey-Input").addEventListener("input",preveiwShip,false)
    }
	//shipCardTest();
})









