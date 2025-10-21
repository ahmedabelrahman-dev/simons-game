
// Game Variables
var buttonColours = ["red", "blue", "green", "yellow"];
var gamePattern = [];
var userClickedPattern = [];
var started = false;
var level = 0;
var score = 0;
var highScore = localStorage.getItem('simonHighScore') || 0;
var isShowingSequence = false;

// Audio System
var audioContext;
var audioEnabled = localStorage.getItem('simonAudioEnabled') !== 'false';
var masterVolume = parseFloat(localStorage.getItem('simonVolume') || '0.7');
var audioBuffers = {};

// Initialize the game
$(document).ready(function() {
  // Initialize theme
  initializeTheme();
  
  // Initialize audio system
  initializeAudio();
  
  // Update high score display
  updateHighScoreDisplay();
  
  // Update audio button state
  updateAudioButtonState();
  
  // Setup event listeners
  setupEventListeners();
});

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('simonTheme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('simonTheme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('.theme-icon');
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Audio System Management
function initializeAudio() {
  try {
    // Initialize Web Audio API
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Generate synthetic sounds for better quality
    generateSyntheticSounds();
    
    console.log('Audio system initialized successfully');
  } catch (error) {
    console.log('Web Audio API not supported, falling back to HTML5 audio');
    audioContext = null;
  }
}

function generateSyntheticSounds() {
  if (!audioContext) return;
  
  // Generate tones for each color
  const frequencies = {
    red: 220,    // A3
    green: 277,  // C#4
    yellow: 330, // E4
    blue: 392    // G4
  };
  
  Object.keys(frequencies).forEach(color => {
    audioBuffers[color] = generateTone(frequencies[color], 0.3);
  });
  
  // Generate wrong sound (dissonant chord)
  audioBuffers.wrong = generateWrongSound();
}

function generateTone(frequency, duration) {
  if (!audioContext) return null;
  
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    // Create a more musical tone with envelope
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 3); // Exponential decay
    data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
  }
  
  return buffer;
}

function generateWrongSound() {
  if (!audioContext) return null;
  
  const sampleRate = audioContext.sampleRate;
  const duration = 0.5;
  const length = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 2);
    // Create a dissonant sound with multiple frequencies
    data[i] = (
      Math.sin(2 * Math.PI * 150 * t) +
      Math.sin(2 * Math.PI * 200 * t) +
      Math.sin(2 * Math.PI * 250 * t)
    ) * envelope * 0.2;
  }
  
  return buffer;
}

function playSyntheticSound(color) {
  if (!audioContext || !audioBuffers[color]) return;
  
  try {
    // Resume audio context if suspended (required for some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = audioBuffers[color];
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.value = masterVolume;
    source.start();
  } catch (error) {
    console.log('Error playing synthetic sound:', error);
  }
}

// Event Listeners
function setupEventListeners() {
  // Theme toggle
  $('#theme-toggle').click(toggleTheme);
  
  // Audio toggle
  $('#audio-toggle').click(function() {
    toggleAudio();
    updateAudioButtonState();
  });
  
  // Game start
  $(document).keypress(function() {
    if (!started && !isShowingSequence) {
      startGame();
    }
  });
  
  // Button clicks
  $('.btn').click(function() {
    if (started && !isShowingSequence) {
      const userChosenColour = $(this).attr('id');
      userClickedPattern.push(userChosenColour);
      
      playSound(userChosenColour);
      animatePress(userChosenColour);
      
      checkAnswer(userClickedPattern.length - 1);
    }
  });
  
  // Restart button
  $('#restart-btn').click(function() {
    hideGameOverModal();
    startGame();
  });
  
  // Click outside modal to close
  $('#game-over-modal').click(function(e) {
    if (e.target === this) {
      hideGameOverModal();
    }
  });
}

// Game Logic
function startGame() {
  started = true;
  level = 0;
  score = 0;
  gamePattern = [];
  userClickedPattern = [];
  updateScoreDisplay();
  $("#level-title").text("Level " + level);
  nextSequence();
}

function nextSequence() {
  isShowingSequence = true;
  userClickedPattern = [];
  level++;
  score = level - 1;
  updateScoreDisplay();
  
  $("#level-title").text("Level " + level);

  var randomNumber = Math.floor(Math.random() * 4);
  var randomChosenColour = buttonColours[randomNumber];
  gamePattern.push(randomChosenColour);

  // Show the sequence with improved animation
  showSequence();
}

function showSequence() {
  let i = 0;
  const showNextButton = () => {
    if (i < gamePattern.length) {
      const currentColour = gamePattern[i];
      
      // Enhanced visual feedback
      $("#" + currentColour).addClass("flash");
      playSound(currentColour);
      
      setTimeout(() => {
        $("#" + currentColour).removeClass("flash");
        i++;
        
        if (i < gamePattern.length) {
          setTimeout(showNextButton, 300);
        } else {
          isShowingSequence = false;
        }
      }, 300);
    }
  };
  
  setTimeout(showNextButton, 500);
}

function checkAnswer(currentLevel) {
  if (gamePattern[currentLevel] === userClickedPattern[currentLevel]) {
    if (userClickedPattern.length === gamePattern.length) {
      setTimeout(function() {
        nextSequence();
      }, 1000);
    }
  } else {
    gameOver();
  }
}

function gameOver() {
  playSound("wrong");
  
  // Add game over effect
  $("body").addClass("game-over");
  setTimeout(function() {
    $("body").removeClass("game-over");
  }, 500);
  
  // Update high score if necessary
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('simonHighScore', highScore);
    updateHighScoreDisplay();
  }
  
  // Show game over modal
  showGameOverModal();
  
  // Reset game
  startOver();
}

function showGameOverModal() {
  $('#final-score').text(score);
  $('#game-over-modal').removeClass('hidden');
}

function hideGameOverModal() {
  $('#game-over-modal').addClass('hidden');
}

function startOver() {
  level = 0;
  gamePattern = [];
  started = false;
  isShowingSequence = false;
  $("#level-title").text("Press Any Key to Start");
}

// Utility Functions
function playSound(name) {
  if (!audioEnabled) return;
  
  // Try synthetic sounds first (better quality)
  if (audioContext && audioBuffers[name]) {
    playSyntheticSound(name);
    return;
  }
  
  // Fallback to HTML5 audio
  try {
  var audio = new Audio("sounds/" + name + ".mp3");
    audio.volume = masterVolume;
    audio.play().catch(function(error) {
      console.log("Audio play failed:", error);
    });
  } catch (error) {
    console.log("Sound error:", error);
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  localStorage.setItem('simonAudioEnabled', audioEnabled);
  updateAudioButtonState();
}

function setVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('simonVolume', masterVolume);
}

function updateAudioButtonState() {
  const audioButton = document.getElementById('audio-toggle');
  const audioIcon = document.querySelector('.audio-icon');
  
  if (audioEnabled) {
    audioButton.classList.remove('muted');
    audioIcon.textContent = '🔊';
  } else {
    audioButton.classList.add('muted');
    audioIcon.textContent = '🔇';
  }
}

function animatePress(currentColor) {
  $("#" + currentColor).addClass("pressed");
  setTimeout(function() {
    $("#" + currentColor).removeClass("pressed");
  }, 150);
}

function updateScoreDisplay() {
  $('#score').text(score);
}

function updateHighScoreDisplay() {
  $('#high-score').text(highScore);
}

// Keyboard shortcuts
$(document).keydown(function(e) {
  // ESC key to close modal
  if (e.keyCode === 27) { // ESC key
    if (!$('#game-over-modal').hasClass('hidden')) {
      hideGameOverModal();
    }
  }
  
  // Space bar to restart when game over
  if (e.keyCode === 32) { // Space bar
    if (!$('#game-over-modal').hasClass('hidden')) {
      hideGameOverModal();
      startGame();
    }
  }
});

// Prevent right-click context menu on game buttons
$('.btn').on('contextmenu', function(e) {
  e.preventDefault();
});

// Add some visual feedback for better UX
$(document).ready(function() {
  // Ensure buttons are visible
  $('.btn').css('opacity', '1').css('transform', 'scale(1)');
});
