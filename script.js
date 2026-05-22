// 示例课程数据
const defaultLessons = [
    {
        id: 1,
        title: "C4T1S4 - Urban Landscape",
        text: "Good day, ladies and gentlemen. I have been asked today to talk to you about the urban landscape. There are two major areas that I will focus on in my talk: how vegetation can have a significant effect on urban climate, and how we can better plan our cities using trees to provide a more comfortable environment for us to live in. Trees can have a significant impact on our cities. They can make a city, as a whole, a bit less windy or a bit more windy, if that's what you want. They can make it a bit cooler if it's a hot summer day in an Australian city, or they can make it a bit more humid if it's a dry inland city. On the local scale - that is, in particular areas within the city - trees can make the local area more shady, cooler, more humid and much less windy. In fact trees and planting of various kinds can be used to make city streets actually less dangerous in particular areas. How do trees do all that, you ask? Well, the main difference between a tree and a building is a tree has got an internal mechanism to keep the temperature regulated. It evaporates water through its leaves and that means that the temperature of the leaves is never very far from our own body temperature. The temperature of a building surface on a hot sunny day can easily be twenty degrees more than our temperature. Trees, on the other hand, remain cooler than buildings because they sweat. This means that they can humidify the air and cool it - a property which can be exploited to improve the local climate. Trees can also help break the force of winds. The reason that high buildings make it windier at ground level is that, as the wind goes higher and higher, it goes faster and faster. When the wind hits the building, it has to go somewhere. Some of it goes over the top and some goes around the sides of the building, forcing those high level winds down to ground level. That doesn't happen when you have trees. Trees filter the wind and considerably reduce it, preventing those very large strong gusts that you so often find around tall buildings. Another problem in built-up areas is that traffic noise is intensified by tall buildings. By planting a belt of trees at the side of the road, you can make things a little quieter, but much of the vehicle noise still goes through the trees. Trees can also help reduce the amount of noise in the surroundings, although the effect is not as large as people like to think. Low-frequency noise, in particular, just goes through the trees as though they aren't there. Although trees can significantly improve the local climate, they do however take up a lot of space. There are root systems to consider and branches blocking windows and so on. It may therefore be difficult to fit trees into the local landscape. There is not a great deal you can do if you have what we call a street canyon - a whole set of high-rises enclosed in a narrow street. Trees need water to grow. They also need some sunlight to grow and you need room to put them. If you have the chance of knocking buildings down and replacing them, then suddenly you can start looking at different ways to design the streets and to introduce.",
        audioUrl: "https://raysu672-glitch.github.io/P4gendu/C4T1S4.mp3",
        duration: "3:45",
        timestamps: []
    }
];

// 全局状态
let currentLesson = null;
let audioPlayer = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = null;
let userStats = {
    completed: [],
    recorded: [],
    totalMinutes: 0
};

// TTS相关
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isPlayingTTS = false;
let ttsStartTime = null;
let ttsProgressInterval = null;

// DOM 元素
const elements = {
    lessonList: document.getElementById('lessonList'),
    textContainer: document.getElementById('textContainer'),
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedValue'),
    progressFill: document.getElementById('progressFill'),
    recordBtn: document.getElementById('recordBtn'),
    stopRecordBtn: document.getElementById('stopRecordBtn'),
    recordingStatus: document.getElementById('recordingStatus'),
    playbackSection: document.getElementById('playbackSection'),
    userAudio: document.getElementById('userAudio'),
    downloadBtn: document.getElementById('downloadBtn'),
    completedCount: document.getElementById('completedCount'),
    recordedCount: document.getElementById('recordedCount'),
    totalTime: document.getElementById('totalTime'),
    customText: document.getElementById('customText'),
    customAudio: document.getElementById('customAudio'),
    addCustomBtn: document.getElementById('addCustomBtn')
};

// 初始化
function init() {
    loadStats();
    renderLessonList();
    setupEventListeners();
    createAudioPlayer();
}

// 创建音频播放器
function createAudioPlayer() {
    audioPlayer = new Audio();
    audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
    audioPlayer.addEventListener('ended', handleAudioEnded);
    audioPlayer.addEventListener('loadedmetadata', () => {
        console.log('Audio loaded, duration:', audioPlayer.duration);
    });
}

// 使用TTS播放文本
function speakText(text) {
    if (!speechSynthesis) {
        alert('您的浏览器不支持语音合成，请使用Chrome、Edge或Safari浏览器');
        return;
    }
    
    // 取消之前的语音
    speechSynthesis.cancel();
    
    // 创建新的语音 utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = parseFloat(elements.speedSlider.value);
    
    // 获取英文语音
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (englishVoice) {
        currentUtterance.voice = englishVoice;
    }
    
    // 开始播放
    currentUtterance.onstart = () => {
        isPlayingTTS = true;
        ttsStartTime = Date.now();
        elements.playBtn.disabled = true;
        elements.pauseBtn.disabled = false;
        
        // 启动进度更新
        startTTSProgress();
    };
    
    // 播放结束
    currentUtterance.onend = () => {
        isPlayingTTS = false;
        stopTTSProgress();
        handleTTSEnded();
    };
    
    // 播放错误
    currentUtterance.onerror = (e) => {
        console.error('TTS错误:', e);
        isPlayingTTS = false;
        stopTTSProgress();
        elements.playBtn.disabled = false;
        elements.pauseBtn.disabled = true;
    };
    
    speechSynthesis.speak(currentUtterance);
}

// 启动TTS进度更新
function startTTSProgress() {
    if (ttsProgressInterval) clearInterval(ttsProgressInterval);
    
    const words = elements.textContainer.querySelectorAll('.word');
    const totalWords = words.length;
    const estimatedDuration = totalWords * 0.6 * 1000; // 估算总时长（毫秒）
    
    ttsProgressInterval = setInterval(() => {
        if (!isPlayingTTS || !ttsStartTime) return;
        
        const elapsed = Date.now() - ttsStartTime;
        const progress = Math.min((elapsed / estimatedDuration) * 100, 100);
        elements.progressFill.style.width = progress + '%';
        
        // 计算当前应该高亮的单词
        const wordIndex = Math.floor((elapsed / estimatedDuration) * totalWords);
        
        words.forEach((word, index) => {
            word.classList.remove('highlight', 'played');
            if (index === wordIndex) {
                word.classList.add('highlight');
                // 移除自动滚动，让用户自己控制位置
            } else if (index < wordIndex) {
                word.classList.add('played');
            }
        });
    }, 100);
}

// 停止TTS进度更新
function stopTTSProgress() {
    if (ttsProgressInterval) {
        clearInterval(ttsProgressInterval);
        ttsProgressInterval = null;
    }
}

// TTS播放结束处理
function handleTTSEnded() {
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.progressFill.style.width = '100%';
    
    // 标记为已完成
    if (currentLesson && !userStats.completed.includes(currentLesson.id)) {
        userStats.completed.push(currentLesson.id);
        saveStats();
        renderLessonList();
    }
    
    // 清除高亮
    const words = elements.textContainer.querySelectorAll('.word');
    words.forEach(word => word.classList.remove('highlight'));
}

// 加载统计数据
function loadStats() {
    const saved = localStorage.getItem('shadowReadingStats');
    if (saved) {
        userStats = JSON.parse(saved);
        updateStatsDisplay();
    }
}

// 保存统计数据
function saveStats() {
    localStorage.setItem('shadowReadingStats', JSON.stringify(userStats));
    updateStatsDisplay();
}

// 更新统计显示
function updateStatsDisplay() {
    elements.completedCount.textContent = userStats.completed.length;
    elements.recordedCount.textContent = userStats.recorded.length;
    elements.totalTime.textContent = Math.round(userStats.totalMinutes);
}

// 渲染课程列表
function renderLessonList() {
    elements.lessonList.innerHTML = '';
    defaultLessons.forEach(lesson => {
        const item = document.createElement('div');
        item.className = 'lesson-item';
        if (currentLesson?.id === lesson.id) {
            item.classList.add('active');
        }
        if (userStats.completed.includes(lesson.id)) {
            item.classList.add('completed');
        }
        
        item.innerHTML = `
            <div>
                <div class="lesson-title">${lesson.title}</div>
                <div class="lesson-duration">${lesson.duration}</div>
            </div>
        `;
        item.addEventListener('click', () => selectLesson(lesson));
        elements.lessonList.appendChild(item);
    });
}

// 选择课程
function selectLesson(lesson) {
    // 停止当前播放
    if (isPlayingTTS) {
        speechSynthesis.cancel();
        isPlayingTTS = false;
        stopTTSProgress();
    }
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
    }
    
    currentLesson = lesson;
    renderLessonList();
    renderText();
    
    // 加载音频（如果有外部URL）
    if (lesson.audioUrl) {
        audioPlayer.src = lesson.audioUrl;
        audioPlayer.load();
    }
    
    // 重置播放器状态
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.progressFill.style.width = '0%';
    
    // 隐藏录音回放区
    elements.playbackSection.style.display = 'none';
}

// 渲染文本（带时间戳）
function renderText() {
    if (!currentLesson) return;
    
    const words = currentLesson.text.split(/\s+/);
    elements.textContainer.innerHTML = '';
    
    words.forEach((word, index) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word + ' ';
        span.dataset.index = index;
        span.dataset.startTime = currentLesson.timestamps[index] || 0;
        span.dataset.endTime = currentLesson.timestamps[index + 1] || 
            (currentLesson.timestamps[index] + 1) || 999;
        elements.textContainer.appendChild(span);
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 播放控制
    elements.playBtn.addEventListener('click', playAudio);
    elements.pauseBtn.addEventListener('click', pauseAudio);
    
    // 语速控制
    elements.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        elements.speedValue.textContent = speed.toFixed(1) + 'x';
        if (audioPlayer) {
            audioPlayer.playbackRate = speed;
        }
    });
    
    // 录音控制
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopRecordBtn.addEventListener('click', stopRecording);
    
    // 下载按钮
    elements.downloadBtn.addEventListener('click', downloadRecording);
    
    // 自定义内容
    elements.addCustomBtn.addEventListener('click', addCustomLesson);
}

// 播放音频
function playAudio() {
    if (!currentLesson) return;
    
    // 如果有外部音频URL，使用Audio播放
    if (currentLesson.audioUrl) {
        if (!audioPlayer.src) {
            audioPlayer.src = currentLesson.audioUrl;
        }
        audioPlayer.play().then(() => {
            elements.playBtn.disabled = true;
            elements.pauseBtn.disabled = false;
        }).catch(err => {
            console.error('播放失败:', err);
            alert('音频加载失败，请重试');
        });
    } else {
        // 使用TTS播放
        speakText(currentLesson.text);
    }
}

// 暂停音频
function pauseAudio() {
    if (currentLesson?.audioUrl) {
        audioPlayer.pause();
    } else if (isPlayingTTS) {
        speechSynthesis.cancel();
        isPlayingTTS = false;
        stopTTSProgress();
    }
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
}

// 处理时间更新（同步高亮）
function handleTimeUpdate() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    
    // 更新进度条
    const progress = (currentTime / duration) * 100;
    elements.progressFill.style.width = progress + '%';
    
    // 高亮当前单词
    const words = elements.textContainer.querySelectorAll('.word');
    words.forEach(word => {
        const startTime = parseFloat(word.dataset.startTime);
        const endTime = parseFloat(word.dataset.endTime);
        
        word.classList.remove('highlight', 'played');
        
        if (currentTime >= startTime && currentTime < endTime) {
            word.classList.add('highlight');
            // 移除自动滚动，让用户自己控制位置
        } else if (currentTime >= endTime) {
            word.classList.add('played');
        }
    });
}

// 音频播放结束
function handleAudioEnded() {
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.progressFill.style.width = '100%';
    
    // 标记为已完成
    if (currentLesson && !userStats.completed.includes(currentLesson.id)) {
        userStats.completed.push(currentLesson.id);
        saveStats();
        renderLessonList();
    }
    
    // 清除高亮
    const words = elements.textContainer.querySelectorAll('.word');
    words.forEach(word => word.classList.remove('highlight'));
}

// 开始录音
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            elements.userAudio.src = url;
            elements.playbackSection.style.display = 'block';
            
            // 保存录音记录
            if (currentLesson && !userStats.recorded.includes(currentLesson.id)) {
                userStats.recorded.push(currentLesson.id);
                saveStats();
            }
            
            // 停止所有音轨
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        
        // 更新UI
        elements.recordBtn.disabled = true;
        elements.stopRecordBtn.disabled = false;
        elements.recordingStatus.classList.add('recording');
        elements.recordingStatus.querySelector('.status-text').textContent = '正在录音...';
        
    } catch (err) {
        console.error('录音失败:', err);
        alert('无法访问麦克风，请检查权限设置');
    }
}

// 停止录音
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // 计算录音时长
        const recordingDuration = (Date.now() - recordingStartTime) / 60000;
        userStats.totalMinutes += recordingDuration;
        saveStats();
        
        // 更新UI
        elements.recordBtn.disabled = false;
        elements.stopRecordBtn.disabled = true;
        elements.recordingStatus.classList.remove('recording');
        elements.recordingStatus.querySelector('.status-text').textContent = '录音完成';
    }
}

// 下载录音
function downloadRecording() {
    if (recordedChunks.length === 0) return;
    
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-reading-${currentLesson?.title || 'recording'}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 添加自定义课程
function addCustomLesson() {
    const text = elements.customText.value.trim();
    const audioFile = elements.customAudio.files[0];
    
    if (!text) {
        alert('请输入英文文本');
        return;
    }
    
    const newLesson = {
        id: Date.now(),
        title: `自定义课程 ${defaultLessons.length + 1}`,
        text: text,
        audioUrl: audioFile ? URL.createObjectURL(audioFile) : '',
        duration: '0:00',
        timestamps: generateTimestamps(text)
    };
    
    defaultLessons.push(newLesson);
    renderLessonList();
    
    // 清空表单
    elements.customText.value = '';
    elements.customAudio.value = '';
    
    // 自动选择新课程
    selectLesson(newLesson);
    
    alert('自定义课程已添加！');
}

// 生成时间戳（简单估算）
function generateTimestamps(text) {
    const words = text.split(/\s+/);
    const timestamps = [];
    let currentTime = 0;
    
    words.forEach(() => {
        timestamps.push(currentTime);
        currentTime += 0.6; // 假设每个词0.6秒
    });
    
    return timestamps;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
