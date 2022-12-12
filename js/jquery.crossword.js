(function($){

	$.fn.crossword = function(entryData) {
			/*
				Qurossword Puzzle: a javascript + jQuery crossword puzzle
				"light" refers to a white box - or an input
				DEV NOTES: 
				- activePosition and activeClueIndex are the primary vars that set the ui whenever there's an interaction
				- 'Entry' is a puzzler term used to describe the group of letter inputs representing a word solution
				- This puzzle isn't designed to securely hide answerers. A user can see answerers in the js source
					- An xhr provision can be added later to hit an endpoint on keyup to check the answerer
				- The ordering of the array of problems doesn't matter. The position & orientation properties is enough information
				- Puzzle authors must provide a starting x,y coordinates for each entry
				- Entry orientation must be provided in lieu of provided ending x,y coordinates (script could be adjust to use ending x,y coords)
				- Answers are best provided in lower-case, and can NOT have spaces - will add support for that later
			*/
			var puzz = {}; // put data array in object literal to namespace it into safety
			puzz.data = entryData;

			$('#puzzle-wrapper').before(
				'<div class="headerGames"><h1>Crossword</h1></div>'
			);
			
			// Generazione del div contenente le domande attraverso Html
			this.after('<div id="cluescontainer" class="rotate-center"><div class="dropdowncontainer" id="dropdownicon" hidden>'+
			'<img src="images/dropdownmenu.png" class="harmonium"><h2 id="clues-buttontext">DEFINIZIONI</h2></div>'+
			'<div id="puzzle-clues" hidden><h2>Orizzontali</h2><p class="clues-li" id="across"></p>'+
			'<h2>Verticali</h2><p class="clues-li" id="down"></p></div><div class="dropdowncontainer">'+
			'<img src="images/closemenu.png" class="harmonium" id="dropdownclose"></div></div>');

			$('body').append('<div id="solution"><input type="button" class="btnStyle" id="btnBack" value="Indietro"></input>'+
			'<input type="button" class="btnStyle" id="btnSolution" value="Mostra Soluzioni"></input></div>')
			
			// Dichiarazione di variabili
			var tbl = ['<table id="puzzle" hidden>'],
			    puzzEl = this,
				clues = $('#puzzle-clues'),
				clueLiEls,
				coords,
				selectedIndex,
				clickCounter,
				entryCount = puzz.data.length,
				entries = [], 
				rows = [],
				cols = [],
				rowss = [],
				colss = [],
				solved = [],
				tabindex,
				$actives = '',
				activePosition = 0,
				activeClueIndex = 0,
				currOri,
				e1Cell,
				e2Cell,
				e1Ori,
				e2Ori,
				targetInput,
				mode = 'interacting',
				solvedToggle = false,
				z = 0;
				mod = 0;

			var puzInit = {
				
				init: function() {
					currOri = 'across'; // app's init orientation could move to config object
					
					// Reorder the problems array ascending by POSITION
					puzz.data.sort(function(a,b) {
						return a.position - b.position;
					});

					// Set keyup handlers for the 'entry' inputs that will be added presently
					puzzEl.delegate('input', 'keyup', function(e){
						mode = 'interacting';

						// need to figure out orientation up front, before we attempt to highlight an entry
						switch(e.which) {
							case 39:
							case 37:
								currOri = 'across';
								break;
							case 38:
							case 40:
								currOri = 'down';
								break;
							default:
								break;
						}
						
						if (e.keyCode === 9) {
							return false;
						} else if (
							e.keyCode === 37 ||
							e.keyCode === 38 ||
							e.keyCode === 39 ||
							e.keyCode === 40 ||
							e.keyCode === 8 ||
							e.keyCode === 46||
							e.keyCode === 229) {						
							
							//Se il keyCode corrisponde al tasto delete o canc, controllando l'orientamento
							//provvede ad eliminare verso sinistra o verso l'alto. 
							//Altrimenti procede nella scrittura del carattere immesso
							if (e.keyCode === 8 || e.keyCode ===46){
								puzInit.checkallAnswer(e,this)
								currOri === 'across' ? nav.nextPrevNav(e, 37) : nav.nextPrevNav(e, 38);
								return;

							//Versione per risolvere bug presente in Android al momento della cancellazione
							}else if (e.keyCode === 229){
								var inputChar = this.value
								this.value = inputChar
								if( inputChar.toUpperCase() != inputChar.toLowerCase() ) {
									currOri === 'across' ? nav.nextPrevNav(e, 39) : nav.nextPrevNav(e, 40);
								}
								
							}else {
								nav.nextPrevNav(e);
							}

							e.preventDefault();
							return false;

						} else {
							//Controllo se la risposta è corretta
							puzInit.checkAnswer(e, this);
							currOri === 'across' ? nav.nextPrevNav(e, 39) : nav.nextPrevNav(e, 40);
						}
						e.preventDefault();
						return false;					
					});
			
					// tab navigation handler setup
					puzzEl.delegate('input', 'keydown', function(e) {

						if ( e.keyCode === 9) {
							
							mode = "setting ui";
							if (solvedToggle) solvedToggle = false;
							nav.updateByEntry(e);
							
						} else {
							return true;
						}
					
						e.preventDefault();
									
					});

					//Alla variazione del contenuto di un input controlla che le risposte che interessano quell'input siano corrette
					puzzEl.delegate('input', 'change', function(e) {
						puzInit.checkallAnswer(e,this);
					});

					// tab navigation handler setup
					puzzEl.delegate('input', 'click', function(e) {
						mode = "setting ui";
						if (solvedToggle) solvedToggle = false;
						
						nav.updateByEntry(e);
				
						e.preventDefault();
									
					});

					//Funzione che permette di cambiare orientamento al secondo click del mouse
					puzzEl.delegate('input', 'click', function(e) {
						
						if (this == selectedIndex){
							clickCounter +=1;
						}else{
							clickCounter = 0;
						}

						selectedIndex = this;
						
						mode = "setting ui";
						if (solvedToggle) solvedToggle = false;

						if (clickCounter%2==1 & clickCounter!=0){
							nav.changeUpdateByEntry(e);
						}
						e.preventDefault();
						$(e.target).focus();
						$(e.target).select();
									
					});
					
					// click/tab clues 'navigation' handler setup
					clues.delegate('p', 'click', function(e) {
						mode = 'setting ui';
						
						if (!e.keyCode) {
							nav.updateByNav(e);
						} 
						e.preventDefault(); 
					});
					
					// highlight the letter in selected 'light' - better ux than making user highlight letter with second action
					puzzEl.delegate('#puzzle', 'click', function(e) {
						$(e.target).focus();
						$(e.target).select();
					});
					
					// DELETE FOR BG
					puzInit.calcCoords();
					
					// Puzzle clues added to DOM in calcCoords(), so now immediately put mouse focus on first clue
					clueLiEls = $('#puzzle-clues li');
					$('#' + currOri + ' li' ).eq(0).addClass('clues-active').focus();
				
					// DELETE FOR BG
					puzInit.buildTable();
					puzInit.buildEntries();						
				},
				
				/*
					- Given beginning coordinates, calculate all coordinates for entries, puts them into entries array
					- Builds clue markup and puts screen focus on the first one
				*/
				
				calcCoords: function() {
					/*
						Calculate all puzzle entry coordinates, put into entries array
					*/
					for (var i = 0, p = entryCount; i < p; ++i) {	
						// set up array of coordinates for each problem
						entries.push(i);
						entries[i] = [];

						var coordx = puzz.data[i].startx;
						var coordy = puzz.data[i].starty;
						j = puzz.data[i].answer.length;

						for (var x=0 ; x < j; x++) {
							entries[i].push(x);
							coords = puzz.data[i].orientation === 'across' ? "" + coordx++ + "," + puzz.data[i].starty + "" : "" + puzz.data[i].startx + "," + coordy++ + "" ;
							entries[i][x] = coords; 
						}
						
						// while we're in here, add clues to DOM!
						var positions = puzz.data[i].position
						if (positions == 0){
							positions = 1
						}
						$('#' + puzz.data[i].orientation).append('<p class="clue-index" tabindex="1" data-position="' + i  + '" id=clue'+i+'>'+ positions + ' - ' + puzz.data[i].clue + '</p>'); 
					}		
					
					// Calculate rows/cols by finding max coords of each entry, then picking the highest
					for (var i = 0, p = entryCount; i < p; ++i) {
						
						for (var x=0; x < entries[i].length; x++) {
							colss.push(entries[i][x].split(',')[0]);
							rowss.push(entries[i][x].split(',')[1]);
						};
						
					}
					rows = Math.max.apply(Math, rowss) + "";
					cols = Math.max.apply(Math, colss) + "";
				}
				,
				
				/*
					Build the table markup
					- adds [data-coords] to each <td> cell
				*/
				buildTable: function() {
					// Aggiunta della prima riga fissa nella tabella
					tbl.push("<tr class='cluePar' id='riga0' hidden>")
					tbl.push('<td colspan="11" ><p id="parRiga0"></p></td>');
					tbl.push("</tr>");
					for (var i=1; i <= rows; ++i) {
						// Aggiunta di colonne nascoste, le quali verrano popolate con la domanda al momento del click
						tbl.push("<tr class='cluePar' id='riga"+i+"'hidden>");	
						tbl.push('<td colspan="11"><p id="parRiga'+i+'" class="parRiga"></p></td>');
						tbl.push("</tr>");

						tbl.push("<tr>");
							for (var x=1; x <= cols; ++x) {
								tbl.push('<td class="tabledata" data-coords="' + x + ',' + i + '"></td>');
							};
						tbl.push("</tr>");
					};

					tbl.push("</table>");
					puzzEl.append(tbl.join(''));
					
				},
				
				/*
					Builds entries into table
					- Adds entry class(es) to <td> cells
					- Adds tabindexes to <inputs> 
				*/
				buildEntries: function() {
					var puzzCells = $('#puzzle td'),
						light,
						$groupedLights,
						hasOffset = false,
						positionOffset = entryCount - puzz.data[puzz.data.length-1].position; // diff. between total ENTRIES and highest POSITIONS
						
					for (var x=1, p = entryCount; x <= p; ++x) {
						var letters = puzz.data[x-1].answer.split('');

						for (var i=0; i < entries[x-1].length; ++i) {
							light = $(puzzCells +'[data-coords="' + entries[x-1][i] + '"]');
							
							// check if POSITION property of the entry on current go-round is same as previous. 
							// If so, it means there's an across & down entry for the position.
							// Therefore you need to subtract the offset when applying the entry class.
							if(x > 1){
								if (puzz.data[x-1].position === puzz.data[x-2].position) {
									hasOffset = true;
								};
							}
							
							if($(light).empty()){
								$(light)
									.addClass('entry-' + (hasOffset ? x - positionOffset : x) + ' position-' + (x-1) )
									.append('<input class="cella" maxlength="1" type="text" tabindex="-1"/>');
							}
						};
						
					};	
					
					// Put entry number in first 'light' of each entry, skipping it if already present
					//for (var i=0, p = entryCount; i <= p; ++i) {
					for (var i=0; i<=entryCount; i++){
						$groupedLights = $('.entry-' + i);

						//if(!$('.entry-' + i +':eq(0) span').length){
						if (i>0 && i<entryCount) {
							if (puzz.data[i].position != puzz.data[i-1].position) {
								$groupedLights.eq(0)
									.append('<span id="span' + i + '">' +i+  '</span>');
							} else {
								$groupedLights.eq(0)
									.append('<span id="span' + i + '">' + (parseInt(puzz.data[i].position)) + '</span>');
							}
						}

					}	
					
					//util.highlightEntry();
					//util.highlightClue();
					$('.active').eq(0).focus();
					$('.active').eq(0).select();
				},
				
				/*
					- Checks current entry input group value against answer
					- If not complete, auto-selects next input for user
				*/
				checkAnswer: function(e, tdElement) {

					var valToCheck, currVal;
					var tdElement = tdElement.parentElement.className;

					util.getActivePositionFromClassGroup($(e.target));
				
					valToCheck = puzz.data[activePosition].answer.toLowerCase();

					currVal = $('.position-' + activePosition + ' input')
						.map(function() {
					  		return $(this)
								.val()
								.toLowerCase();
						})
						.get()
						.join('');

					if(valToCheck === currVal){	
						$('.active')
							//.prop("disabled", true)
							.addClass('done')
							.removeClass('active');
					
						$('.clues-active').addClass('clue-done');

						solved.push(valToCheck);
						solvedToggle = true;
						return;
					}

					//currOri === 'across' ? nav.nextPrevNav(e, 39) : nav.nextPrevNav(e, 40);
					
				},
				
				// Controllo tutte le risposte che si incrociano con la lettera modificata/aggiunta
				checkallAnswer: function(e, tdElement) {
					
					var valToCheck, currVal;
					var tdElement = tdElement.parentElement.className;
					var entryArray = [] ;
					
					for (i=0;i<tdElement.length-1; i++){
						if (isNaN(parseInt(tdElement[i]))==false){
							if (isNaN(parseInt(tdElement[i+1]))==false){
								if (entryArray.includes(tdElement[i]+tdElement[i+1])==false){
									entryArray.push(tdElement[i]+tdElement[i+1])
								}
							}else if (isNaN(parseInt(tdElement[i-1]))==true && isNaN(parseInt(tdElement[i+1]))==true){
								if (entryArray.includes(tdElement[i])==false){
									entryArray.push(tdElement[i])
								}
							}

						}
					}
					
					for (i=0; i<entryArray.length; i++){
						activePosition = entryArray[i];
						console.log(entryArray)
						valToCheck = puzz.data[activePosition].answer.toLowerCase();

						currVal = $('.position-' + activePosition + ' input')
						.map(function() {
					  		return $(this)
								.val()
								.toLowerCase();
						})
						.get()
						.join('');

						if(valToCheck === currVal){	
							$('.position-' + activePosition + ' input').addClass('done')
							var clueIndex = document.querySelector("#clue"+activePosition+"")
							$('#clue'+clueIndex.dataset.position+"").addClass('clue-done')

						}else{
							if(e.keyCode == 8) {
								$('.position-' + activePosition + ' input').removeClass('done')
								var clueIndex = document.querySelector("#clue" + activePosition + "")
								$('#clue' + clueIndex.dataset.position + "").removeClass('clue-done')
							}else{
								if (currVal.length >= valToCheck.length) {
									$('.position-' + activePosition + ' input').removeClass('done')
									var clueIndex = document.querySelector("#clue" + activePosition + "")
									$('#clue' + clueIndex.dataset.position + "").removeClass('clue-done')
								}
							}
						}
					}
					currOri === 'across' ? nav.nextPrevNav(e, 39) : nav.nextPrevNav(e, 40);
				}

			}; // end puzInit object
			
			var nav = {
				
				nextPrevNav: function(e, override) {

					var len = $actives.length,
						struck = override ? override : e.which,
						el = $(e.target),
						p = el.parent(),
						ps = el.parents(),
						selector;

					util.getActivePositionFromClassGroup(el);
					util.highlightEntry();
					util.highlightClue();
					
					$('.current').removeClass('current');
					
					selector = '.position-' + activePosition + ' input';
					
					// move input focus/select to 'next' input
					switch(struck) {
						case 39:
							p
								.next()
								.find('input')
								.addClass('current')
								.select();
							break;
						
						case 37:
							p
								.prev()
								.find('input')
								.addClass('current')
								.select()
							break;

						case 40:
							ps
								.next('tr')
								.next('tr')
								.find(selector)
								.addClass('current')
								.select();

							break;

						case 38:
							ps
								.prev('tr')
								.prev('tr')
								.find(selector)
								.addClass('current')
								.select();

							break;

						default:
						break;
					}
															
				},
	
				updateByNav: function(e) {
					var target;
					currOri = $('.clues-active').parent('p').prop('id');
					$('.clues-active').removeClass('clues-active');
					$('.active').removeClass('active');
					$('.current').removeClass('current');
					currIndex = 0;

					target = e.target;
					activePosition = $(e.target).data('position');
										
					$('.active').eq(0).focus();
					$('.active').eq(0).select();
					$('.active').eq(0).addClass('current');
					
					// store orientation for 'smart' auto-selecting next input
				
					activeClueIndex = $(clueLiEls).index(e.target);
					//console.log('updateByNav() activeClueIndex: '+activeClueIndex);
					util.highlightEntry();
					util.highlightClue();
				},
			
				// Sets activePosition var and adds active class to current entry
				updateByEntry: function(e, next) {
					var classes, next, clue, e1Ori, e2Ori, e1Cell, e2Cell;
					
					if(e.keyCode === 9 || next){
						// handle tabbing through problems, which keys off clues and requires different handling		
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						$('.clues-active').removeClass('.clues-active');
												
						next = $(clueLiEls[activeClueIndex]);
						currOri = next.parent().prop('id');
						activePosition = $(next).data('position');
												
						// skips over already-solved problems
						util.getSkips(activeClueIndex);
						activePosition = $(clueLiEls[activeClueIndex]).data('position');
						
																								
					} else {
						
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						util.getActivePositionFromClassGroup(e.target);
						
						clue = $(clueLiEls + '[data-position=' + activePosition + ']');
						activeClueIndex = $(clueLiEls).index(clue);
						
						currOri = clue.parent().prop('id');
						
					}
						util.highlightEntry();
						util.highlightClue();	
				},

				// Funzione che prende la risposta verticale nel caso siamo in orizzontale e viceversa
				changeUpdateByEntry: function(e, next) {
					var classes, next, clue, e1Ori, e2Ori, e1Cell, e2Cell;
					
					if(e.keyCode === 9 || next){
						// handle tabbing through problems, which keys off clues and requires different handling		
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						$('.clues-active').removeClass('.clues-active');
												
						next = $(clueLiEls[activeClueIndex]);
						currOri = next.parent().prop('id');
						activePosition = $(next).data('position');
												
						// skips over already-solved problems
						util.getSkips(activeClueIndex);
						activePosition = $(clueLiEls[activeClueIndex]).data('position');
						
																								
					} else {
						
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						util.changeActivePositionFromClassGroup(e.target);
						
						clue = $(clueLiEls + '[data-position=' + activePosition + ']');
						activeClueIndex = $(clueLiEls).index(clue);
						
						currOri = clue.parent().prop('id');
						
					}
						util.highlightEntry();
						util.highlightClue();	
				}
				
			}; // end nav object

			
			var util = {
				// Funzione che evidenzia le caselle in cui è contenuta la risposta 
				highlightEntry: function() {
					$actives = $('.active');
					$actives.removeClass('active');
					$actives = $('.position-' + activePosition + ' input').addClass('active');
					$actives.eq(0).focus();
					$actives.eq(0).select();
					util.showClue();
					
				},
				
				// Funzione che evidenza la domanda nell'elenco delle domande
				highlightClue: function() {
					var clue;				
					$('.clues-active').removeClass('clues-active');
					$(clueLiEls + '[data-position=' + activePosition + ']').addClass('clues-active');

					if (mode === 'interacting') {
						clue = $(clueLiEls + '[data-position=' + activePosition + ']');
						activeClueIndex = $(clueLiEls).index(clue);
					};
				},

				// Funzione che permette di mostrare la riga contenente la domanda al di sopra della risposta
				showClue: function() {
					for (var x=0;x<=rows; x++){
						$("#riga"+x).hide()
					}

					//if (currOri == 'across'){
						var riga = entryData[activePosition].starty - 1
					//}else{
						//var riga = entryData[activePosition].starty - 1
					//}
					if (entryData[activePosition].position==0){
						$("#parRiga"+riga).empty().append(1 + ' - ' + entryData[activePosition].clue)
					}else {
						$("#parRiga" + riga).empty().append(entryData[activePosition].position + ' - ' + entryData[activePosition].clue)
					}
					$("#riga"+riga).show()
					
				},
				
				getClasses: function(light, type) {
					if (!light.length) return false;
					
					var classes = $(light).prop('class').split(' '),
					classLen = classes.length,
					positions = []; 

					// pluck out just the position classes
					for(var i=0; i < classLen; ++i){
						if (!classes[i].indexOf(type) ) {
							positions.push(classes[i]);
						}
					}
					
					return positions;
				},

				getActivePositionFromClassGroup: function(el){

						classes = util.getClasses($(el).parent(), 'position');

						if(classes.length > 1){
							// get orientation for each reported position
							e1Ori = $(clueLiEls + '[data-position=' + classes[0].split('-')[1] + ']').parent().prop('id');
							e2Ori = $(clueLiEls + '[data-position=' + classes[1].split('-')[1] + ']').parent().prop('id');

							// test if clicked input is first in series. If so, and it intersects with
							// entry of opposite orientation, switch to select this one instead
							e1Cell = $('.position-' + classes[0].split('-')[1] + ' input').index(el);
							e2Cell = $('.position-' + classes[1].split('-')[1] + ' input').index(el);
							

							if(mode === "setting ui"){
								currOri = e1Cell === 0 ? e1Ori : e2Ori; // change orientation if cell clicked was first in a entry of opposite direction
							}

							if(e1Ori === currOri){
								activePosition = classes[0].split('-')[1];		
							} else if(e2Ori === currOri){
								activePosition = classes[1].split('-')[1];
							}
						} else {
							activePosition = classes[0].split('-')[1];						
						}	
				},

				changeActivePositionFromClassGroup: function(el){

					classes = util.getClasses($(el).parent(), 'position');

					if(classes.length > 1){
						// get orientation for each reported position
						e1Ori = $(clueLiEls + '[data-position=' + classes[0].split('-')[1] + ']').parent().prop('id');
						e2Ori = $(clueLiEls + '[data-position=' + classes[1].split('-')[1] + ']').parent().prop('id');

						// test if clicked input is first in series. If so, and it intersects with
						// entry of opposite orientation, switch to select this one instead
						e1Cell = $('.position-' + classes[0].split('-')[1] + ' input').index(el);
						e2Cell = $('.position-' + classes[1].split('-')[1] + ' input').index(el);
						

						if(mode === "setting ui"){
							currOri = e1Cell === 0 ? e2Ori : e1Ori; // change orientation if cell clicked was first in a entry of opposite direction
						}

						if(e1Ori === currOri){
							activePosition = classes[0].split('-')[1];		
						} else if(e2Ori === currOri){
							activePosition = classes[1].split('-')[1];
						}
					} else {
						activePosition = classes[0].split('-')[1];						
					}	
			},
				
				checkSolved: function(valToCheck) {
					for (var i=0, s=solved.length; i < s; i++) {
						if(valToCheck === solved[i]){
							return true;
						}

					}
				},
				
				getSkips: function(position) {
					if ($(clueLiEls[position]).hasClass('clue-done')){
						activeClueIndex = position === clueLiEls.length-1 ? 0 : ++activeClueIndex;
						util.getSkips(activeClueIndex);						
					} else {
						return false;
					}
				},
				
			}; // end util object

			puzInit.init();

			// Funzione che al click al di fuori delle aree di gioco nasconde la riga contenente la domanda
			$(document).click(function() {
				var container = $("table");
				var container2 = $('.clues-li');
				if (!container.is(event.target) && !container.has(event.target).length && !container2.is(event.target) && !container2.has(event.target).length ) {
					for (var x=0;x<=rows; x++){
						$("#riga"+x).hide()
					}
				}
			});

			// Funzione che mostra tutte le soluzioni del cruciverba
			$('#btnSolution').click(function(){
				for (i=0;i<entryData.length; i++){

					answerPosition = $('.position-' +i+ ' input');
					for (j=0; j<answerPosition.length; j++){
						$('.position-' +i+ ' input')[j].value = entryData[i].answer[j];
						$('.position-' + i + ' input').addClass('done');
						$('.active').removeClass('active')
						$('.clues-active').removeClass('clues-active')
						$('.position-' +i+ ' input')[j].disabled = true
						$('.clue-done').removeClass('clue-done')
					}

				}
			});

		// Funzione che resetta il cruciverba e riporta alla sezione principale, ma senza ricaricare la pagina
			$('#btnBack').click(function(){
				$(".crosswordpuzzlecontainer").hide();
				$(".headerGames").remove();
				$('#puzzle-wrapper').remove()
				$('#cluescontainer').remove()
				$('#solution').remove()
				$('.crosswordpuzzlecontainer').append('<div id="puzzle-wrapper"></div>')
				$('#divIntro').show()
				//window.location.reload()
			});

			// Funzioni che nascondono/rivelano le domande del cruciverba quando si è in modalità mobile
			$("#dropdownicon").click(function(){
				$("#puzzle-clues").fadeIn(1200, "linear");
				$("#solution").fadeIn(1200, "linear");
				$("#dropdownclose").fadeIn();
				$(this).fadeOut();
				mod=0;
			})

			$("#dropdownclose").click(function(){
				$("#puzzle-clues").fadeOut(1200, "linear");
				$("#solution").fadeOut(1200, "linear");
				$("#dropdownicon").fadeIn();
				$(this).fadeOut();
				mod=1;
			})

			window.addEventListener("resize", function() {
				if (mod==1){
					if (this.window.innerWidth<900){
						$("#dropdownicon").show();
						$("#puzzle-clues").hide();
						$("#solution").hide();
					}
					else{
						$("#puzzle-clues").show();
						$("#solution").show();
					}

					if (this.window.innerWidth>900){
						$("#dropdownicon").hide();
					}
					else{
						$("#puzzle-clues").hide(1200, "linear");
					} 
				}
			});
	}
})(jQuery);