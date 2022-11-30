(function($) {
  
  $.fn.hangman = function(hangmanData) {

    function loadClues(){
      for (i=0; i<hangmanData.length; i++){
        hangmanAnswers.push(hangmanData[i]['answer'])
        hangmanClues.push(hangmanData[i]['clue'])
      }
    }

    $('#hangmancontainer').append(
        '<h1 class="text-center">Hangman</h1>'+
        '<input type="button" class="btnStyle" onClick = "audioMode()" id="btnAudioOn" value="Audio On">'+
        '<div class="float-right">Tentativi sbagliati: <span id="mistakes">0</span> of <span id="maxWrong"></span></div>' +
        '<div class="text-center">'+
        '<img id="hangmanPic" src="images/0.jpg" alt="">'+
        '<p id="clueSpotlight"></p>'+
        '<p id="wordSpotlight">The word to be guessed goes here</p>'+
        '<div id="keyboard"></div>'+
        '<input type="button" class="btnStyle" id="btnHangmanBack" value="Indietro">'+
        '<button class="btnStyle" onClick="reset(), remindClue()">Next</button><br>'+
        '<div><img src="images/voice2.png" id="btnVoice" class="btnVoice"></div>'+
        '<h2 className="content1"></h2>'+
        '</div>'
    )
  
    $('#btnHangmanBack').click(function(){
      reset();
      $('#puzzle-wrapper').remove()
      $('#cluescontainer').remove()
      $('#hangmancontainer').remove()
      $('body').append('<div id="puzzle-wrapper"></div>')
      $('body').append('<div id="hangmancontainer" hidden></div>')
      $('#hangmancontainer').hide();
      $('#divIntro').show()
      //window.location.reload()
      hangmanAnswers = []
      hangmanClues = []
    });

    $('#btnVoice').click(function(){
      recognition.start();
    });

    $(document).keyup(function (event) {
        char = String.fromCharCode(event.keyCode).toLowerCase()
        handleGuess(char)
    });

    document.getElementById('maxWrong').innerHTML = maxWrong;

    loadClues();
    randomWord();
    tts(clue)
    generateButtons();
    guessedWord();
  }

})(jQuery)

var hangmanAnswers = []
var hangmanClues = []

let answer = '';
let maxWrong = 6;
let mistakes = 0;
let guessed = [];
let wordStatus = null;

function reset() {
  mistakes = 0;
  guessed = [];
  document.getElementById('hangmanPic').src = 'images/0.jpg';
  document.getElementById('hangmanPic').style.opacity ='1';

  if (hangmanAnswers.length == 0){
    document.getElementById('keyboard').innerHTML = 'Parole terminate!';
  }else {
    randomWord();
    guessedWord();
    updateMistakes();
    generateButtons();
  }

}

function generateButtons() {
  let buttonsHTML = 'abcdefghijklmnopqrstuvwxyz'.split('').map(letter =>
    `
      <button
        class="btnStyleTrans"
        id='` + letter + `'
        onClick="handleGuess('` + letter + `')"
      >
        ` + letter + `
      </button>
    `).join('');

  document.getElementById('keyboard').innerHTML = buttonsHTML;
}

function randomWord() {
  randomNumber = Math.random()
  answer = hangmanAnswers[Math.floor(randomNumber * hangmanAnswers.length)];
  clue = hangmanClues[Math.floor(randomNumber * hangmanClues.length)];
  var randomIndex = Math.floor(randomNumber * hangmanAnswers.length)
  hangmanAnswers.splice(randomIndex, 1)
  hangmanClues.splice(randomIndex, 1)
}

function handleGuess(chosenLetter) {
  chosenLetter = chosenLetter.toLowerCase()
  guessed.indexOf(chosenLetter) === -1 ? guessed.push(chosenLetter) : null;
  document.getElementById(chosenLetter).setAttribute('disabled', true);
  if (answer.toLowerCase().indexOf(chosenLetter) >= 0) {
    guessedWord();
    checkIfGameWon();
  } else if (answer.indexOf(chosenLetter) === -1) {
    mistakes++;
    updateMistakes();
    checkIfGameLost();
    updateHangmanPicture();
  }
}

function guessedWord() {
  //wordStatus = answer.split('').map(letter => (guessed.indexOf(letter) >= 0 ? letter : " _ ")).join('');
  wordStatus = '';
  for (i=0; i<answer.length; i++){
    if (guessed.indexOf(answer[i].toLowerCase()) >= 0){
      wordStatus += answer[i].toLowerCase();
    }else{
      if (answer[i] == ' '){
        wordStatus += '&nbsp;'
      }else{
        wordStatus += ' _ '
      }
    }
  }
  let clueStatus = clue + ':';

  document.getElementById('wordSpotlight').innerHTML = wordStatus;
  document.getElementById('clueSpotlight').innerHTML = clueStatus;

}

function updateMistakes() {
  document.getElementById('mistakes').innerHTML = mistakes;
}

function updateHangmanPicture() {
  document.getElementById('hangmanPic').src = 'images/' + mistakes + '.jpg';
}

function checkIfGameWon() {
  wordStatus = wordStatus.replace(/\s/g, '');
  if (wordStatus.replace('&nbsp;', '') === answer.replace(/\s/g, '').toLowerCase()) {
    document.getElementById('hangmanPic').src = 'images/win.png';
    document.getElementById('hangmanPic').style.opacity ='0.5';
    if (audioOn == true) {
      var audio = new Audio('sounds/nextlevel.wav');
      audio.play();
    }
    for (i=97;i<123; i++) {
      let characterCode = String.fromCharCode(i)
      document.getElementById(characterCode).disabled = true;
    }
  }else{
    if (audioOn == true){
      var audio = new Audio('sounds/win.wav');
      audio.play();
    }
  }
}

function checkIfGameLost() {
  if (mistakes === maxWrong) {
    document.getElementById('wordSpotlight').innerHTML = 'La risposta era: ' + answer;
    document.getElementById('keyboard').innerHTML = 'Hai perso!!!';
    if (audioOn == true) {
      var audio = new Audio('sounds/loselevel.wav');
      audio.play();
    }
  }else{
    if (audioOn == true){
      var audio = new Audio('sounds/lose.wav');
      audio.play();
    }
    setTimeout(remindError(),100)

  }
}

// PARTE DI CODICE RELATIVA AL TEXT TO SPEECH --------------------------------------------------------->

window.onload = function () {
  speak("  ");
};

const speak = (sentance) => {
  const tts = new SpeechSynthesisUtterance(sentance);
  const voices = speechSynthesis.getVoices();
  tts.voice = voices[1]; //changing the voice
  tts.rate = 1;
  tts.pitch = 1; // 0 = deep voice

  window.speechSynthesis.speak(tts);
};

var audioOn = true;

var letterapronunciata = '';
var confermapronunciata = '';

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechConfirm =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();
const confirm = new SpeechConfirm();

recognition.lang = 'it';
confirm.lang = 'it';

//console results
recognition.onstart = () => {
  console.log("Recogniton activated.");
};

recognition.onresult = (event) => {
  const current = event.resultIndex;
  const transcript = event.results[current][0].transcript;

  letterapronunciata = transcript.replace(",", "")
  letterapronunciata = letterapronunciata.replace(/\s/g, '').toLowerCase()

  if (letterapronunciata == answer.replace(/\s/g, '').toLowerCase()){
    console.log('hai indovinato')
  }else {

    switch (letterapronunciata) {
      case 'esse':
        letterapronunciata = 's';
      case 'effe':
        letterapronunciata = 'f';
      case 'emme':
        letterapronunciata = 'm';
      case 'elle':
        letterapronunciata = 'l';
      case 'erre':
        letterapronunciata = 'r';
      case 'enne':
        letterapronunciata = 'n';
    }

    letterapronunciata = letterapronunciata[0].toLowerCase();

    console.log(letterapronunciata)
  }
};

recognition.onend = () => {
  console.log("Recognition deactivated");
  if (letterapronunciata != '' & letterapronunciata != undefined & letterapronunciata != answer.replace(/\s/g, '').toLowerCase()){
    tts("La lettera che vuoi digitare è:" + letterapronunciata)
    setTimeout("startconfirm()", 2000);
  }else if(letterapronunciata == answer.replace(/\s/g, '').toLowerCase()){
    for (i=0; i<answer.length; i++){
      guessed.indexOf(letterapronunciata[i]) === -1 ? guessed.push(letterapronunciata[i]) : null;
    }
    guessedWord()
    checkIfGameWon()
  }else{
    tts("Non ho capito, puoi ripetere?")
  }
};

confirm.onstart= () => {
  console.log("Confirm activated.");
};

confirm.onresult = (event) => {
  const current = event.resultIndex;
  const transcript = event.results[current][0].transcript;

  confermapronunciata = transcript.replace(",", "")
  confermapronunciata = confermapronunciata.toLowerCase().substring(0,2);

  if (confermapronunciata == 'no'){
    console.log("Hai detto no, la tua richiesta è stata eliminata")
  }else if (confermapronunciata == 'sì' || confermapronunciata == 'se' || confermapronunciata == 'si' || confermapronunciata.substring(0,3) == 'see'  ){
    document.getElementById(letterapronunciata.toLowerCase()).click()
  }
};

confirm.onend = () => {
  console.log("Confirm deactivated");
  //recognition.start()
};

function startconfirm(){
  confirm.start()
}

async function tts(message) {
  const speech = new SpeechSynthesisUtterance();
  const voices = speechSynthesis.getVoices();
  speech.voice = voices[1];
  speech.volume = 2;
  speech.rate = 0.9;
  speech.pitch = 0.2; //not so deep
  speech.text = message;
  window.speechSynthesis.speak(speech);
}

function audioMode(){
  if (audioOn == true){
    audioOn = false;
    document.getElementById('btnAudioOn').value = 'Audio Off'
  }else{
    audioOn = true;
    document.getElementById('btnAudioOn').value = 'Audio On'
  }
}

function remindError(){
  if (mistakes < 5){
    tts("Puoi fare ancora " + (6-parseInt(mistakes)) + " errori")
  }else{
    tts("Puoi fare ancora " + (6-parseInt(mistakes)) + " errore")
  }
}

function remindClue(){
  tts(clue);
}