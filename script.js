// 示例课程数据
const defaultLessons = [
    {
        id: 1,
        title: "Daily Greetings",
        text: "Good morning! How are you today? I hope you are having a wonderful day. The weather is beautiful outside.",
        audioUrl: null, // 使用TTS
        duration: "0:30",
        timestamps: [0, 1.2, 2.0, 3.0, 4.5, 5.8, 7.0, 8.5, 10.0, 11.5, 13.0, 14.5, 16.0, 17.5]
    },
    {
        id: 2,
        title: "Introducing Yourself",
        text: "Hello, my name is Sarah. I am from Canada. I work as a teacher and I love reading books in my free time.",
        audioUrl: null, // 使用TTS
        duration: "0:35",
        timestamps: [0, 1.0, 2.5, 3.5, 5.0, 6.5, 8.0, 9.5, 11.0, 12.5, 14.0, 15.5, 17.0, 18.5, 20.0, 21.5, 23.0]
    },
    {
        id: 3,
        title: "Ordering Food",
        text: "Excuse me, I would like to order a sandwich and a cup of coffee, please. Thank you very much.",
        audioUrl: null, // 使用TTS
        duration: "0:25",
        timestamps: [0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0, 10.5, 12.0, 13.5, 15.0, 16.5, 18.0, 19.5]
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
                word.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            word.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
