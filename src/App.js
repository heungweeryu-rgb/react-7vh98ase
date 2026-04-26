import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Clock, Home, Box, BookOpen, User, Flame, ArrowLeft, CheckCircle2, Mic, X, Pencil, Trash2, Check, Sparkles, Wand2, Loader2, Bot } from 'lucide-react';

// --- Gemini API 연동 설정 ---
// ⭐⭐⭐ 여기에 유흥위님의 진짜 API 키를 꼭! 넣어주세요 ⭐⭐⭐
// 큰따옴표("")는 지우지 마시고 그 사이에 쏙 넣어주세요.
const apiKey = "AIzaSyBx3JgGB0MxKTw2OFljfWZPV_hR3hTs3Nk"; 

const callGeminiAPI = async (prompt, isJson = false) => {
  const key = apiKey.trim();
  if (!key || key.includes("여기에새로운열쇠를붙여넣으세요")) {
    throw new Error("앗! 앱에 진짜 API 키(열쇠)를 넣는 것을 깜빡하셨어요. 스택블리츠 코드 6번째 줄을 확인해주세요!");
  }

  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  
  const systemPrompt = "당신은 36개월 미만의 아이를 키우는 한국 부모를 돕는 따뜻하고 전문적인 육아 멘토이자 동화 작가입니다. 항상 친절하고 다정한 말투를 사용하세요.\n\n";
  const finalPrompt = systemPrompt + prompt;

  const payload = {
    contents: [{ parts: [{ text: finalPrompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || '알 수 없는 오류';
      if (response.status === 403) throw new Error("API 키가 올바르지 않거나 권한이 없습니다. AI 스튜디오에서 키를 다시 확인해주세요.");
      if (response.status === 429) throw new Error("구글 무료 사용 한도를 초과했어요! 1분 정도 기다렸다가 다시 시도해주세요.");
      throw new Error(`구글 서버 오류입니다. (${response.status}: ${errorMsg})`);
    }
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
       throw new Error('인공지능이 대답을 만들지 못했어요. 키워드를 조금 바꿔보세요!');
    }
    
    // JSON 응답일 경우 더 안전하게 추출 (인사말 등이 섞여 있어도 {} 안의 내용만 뽑아냄)
    if (isJson) {
      try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) {
           throw new Error("AI 응답에서 JSON 형식을 찾을 수 없습니다.");
        }
        const jsonString = text.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON 파싱 에러:", text);
        throw new Error('인공지능이 놀이 형식을 잘못 만들었어요. 다시 버튼을 눌러주세요!');
      }
    }

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const App = () => {
  // --- 1. LA 시간 및 일과 로직 ---
  const [laTime, setLaTime] = useState(new Date());
  const [currentSchedule, setCurrentSchedule] = useState({ title: '로딩 중...', icon: <Clock /> });

  // --- 화면 전환 상태 추가 ---
  const [currentView, setCurrentView] = useState('home'); 
  const [selectedActivity, setSelectedActivity] = useState(null);

  // --- 음성 기록 상태 추가 ---
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordingUI, setShowRecordingUI] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [records, setRecords] = useState([]); 
  const [editingId, setEditingId] = useState(null); 
  const [editText, setEditText] = useState(''); 
  const recognitionRef = useRef(null);

  // --- 성장일기, 프로필, AI 연동 상태 추가 ---
  const [diaryText, setDiaryText] = useState('');
  const [profile, setProfile] = useState({
    name: '지온',
    birthDate: '2023-05-01',
    height: '90',
    weight: '13'
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // AI 놀이 생성기 상태
  const [aiMaterialsInput, setAiMaterialsInput] = useState('');
  const [isGeneratingPlay, setIsGeneratingPlay] = useState(false);
  const [generatedAiPlays, setGeneratedAiPlays] = useState([]);

  // AI 멘토 피드백 상태
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [aiFeedbackText, setAiFeedbackText] = useState('');

  // AI 수면 유도 동화 생성기 상태
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyKeyword, setStoryKeyword] = useState('');
  const [generatedStory, setGeneratedStory] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // 36개월 미만 아기 추천 일과표
  const scheduleBlocks = [
    { start: 7, end: 9, title: '기상 및 아침 식사', icon: <Sun className="text-yellow-500 w-8 h-8" /> },
    { start: 9, end: 11.5, title: '아침 놀이 시간', icon: <Sun className="text-yellow-500 w-8 h-8" /> },
    { start: 11.5, end: 13, title: '점심 식사', icon: <Sun className="text-orange-500 w-8 h-8" /> },
    { start: 13, end: 15, title: '달콤한 낮잠 시간', icon: <Moon className="text-blue-400 w-8 h-8" /> },
    { start: 15, end: 17.5, title: '오후 놀이 시간', icon: <Sun className="text-yellow-500 w-8 h-8" /> },
    { start: 17.5, end: 19.5, title: '저녁 식사 및 목욕', icon: <Moon className="text-indigo-400 w-8 h-8" /> },
    { start: 19.5, end: 24, title: '꿈나라로 갈 시간', icon: <Moon className="text-indigo-600 w-8 h-8" /> },
    { start: 0, end: 7, title: '꿈나라로 갈 시간', icon: <Moon className="text-indigo-600 w-8 h-8" /> },
  ];

  useEffect(() => {
    // Tailwind 디자인 강제 주입
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    const updateTimeAndSchedule = () => {
      const now = new Date();
      const laTimeString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
      const laDate = new Date(laTimeString);
      setLaTime(laDate);

      const currentHour = laDate.getHours() + laDate.getMinutes() / 60;
      const activeSchedule = scheduleBlocks.find(
        block => currentHour >= block.start && currentHour < block.end
      );
      
      if (activeSchedule) {
        setCurrentSchedule(activeSchedule);
      }
    };

    updateTimeAndSchedule(); 
    const timer = setInterval(updateTimeAndSchedule, 1000); 

    return () => clearInterval(timer);
  }, []);

  const dayOfMonth = laTime.getDate();

  const physicalActivities = [
    {
      title: "실내 장애물 코스",
      tag: "신체 활동",
      duration: "20분",
      intensity: "중간",
      image: "https://images.unsplash.com/photo-1566004100631-35d015d6a491?auto=format&fit=crop&w=400&q=80",
      tagColor: "bg-green-100 text-green-700",
      materials: ["쿠션 3~4개", "부드러운 이불", "안전한 장난감 상자"],
      instructions: [
        "거실 바닥에 쿠션과 이불을 이용해 울퉁불퉁한 길을 만들어주세요.",
        "부모님이 먼저 장애물을 넘는 시범을 보여주며 아이의 흥미를 유도합니다.",
        "아이가 기어가거나 걸어서 장애물을 통과할 때 '영차! 영차!' 응원해주세요.",
        "장애물 끝에 아이가 좋아하는 인형을 두고 도착하면 안아주며 칭찬해줍니다."
      ]
    },
    {
      title: "이불 썰매 타기",
      tag: "신체 활동",
      duration: "15분",
      intensity: "높음",
      image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=400&q=80", 
      tagColor: "bg-green-100 text-green-700",
      materials: ["부드럽고 튼튼한 담요나 이불", "넓고 안전한 거실 공간"],
      instructions: ["넓게 편 담요 위에 아이를 눕히거나 앉혀주세요.", "담요의 모서리를 잡고 천천히 거실을 돌아다니며 '출발~'하고 외쳐주세요."]
    }
  ];

  const sensoryActivities = [
    {
      title: "밀가루 촉감 놀이",
      tag: "감각 활동",
      duration: "15분",
      intensity: "높음",
      image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=400&q=80",
      tagColor: "bg-yellow-100 text-yellow-700",
      materials: ["김장 매트나 큰 비닐", "밀가루", "작은 채반이나 스푼"],
      instructions: ["바닥에 매트를 깔고 밀가루를 조금 부어 아이가 자유롭게 만지도록 둡니다.", "채반에 밀가루를 넣고 눈처럼 내리게 해주며 시각적 흥미를 유발하세요."]
    },
    {
      title: "얼음 땡! 차가운 얼음 놀이",
      tag: "감각 활동",
      duration: "10분",
      intensity: "중간",
      image: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?auto=format&fit=crop&w=400&q=80",
      tagColor: "bg-yellow-100 text-yellow-700",
      materials: ["얼음 5~6조각", "오목한 그릇 2개", "따뜻한 물 약간"],
      instructions: ["그릇에 얼음을 담아주고 아이가 손으로 만져 차가운 감각을 느끼게 해줍니다.", "따뜻한 물을 조금 부어 얼음이 순식간에 녹는 마술을 보여주며 온도의 차이를 설명해주세요."]
    }
  ];

  const todayPhysical = physicalActivities[dayOfMonth % physicalActivities.length];
  const todaySensory = sensoryActivities[dayOfMonth % sensoryActivities.length];

  const formatTime = (date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit', 
      hour12: true
    });
  };

  const handleGenerateAIPlay = async () => {
    if (!aiMaterialsInput.trim()) return;
    setIsGeneratingPlay(true);
    try {
      const prompt = `사용자의 아이 이름은 '${profile.name}'이고, 나이는 약 3세(36개월 미만)입니다. 
      집에 있는 다음 재료들을 활용한 안전하고 재미있는 놀이를 딱 1개 추천해주세요: ${aiMaterialsInput}.
      응답은 반드시 마크다운(\`\`\`json 등) 없이 순수한 JSON 객체 형태로만 출력해주세요. 
      
      반드시 지켜야 할 출력 포맷:
      {
        "title": "놀이 제목 (예: 반짝반짝 호일 공놀이)",
        "tag": "신체 활동 또는 감각 활동",
        "duration": "예: 15분",
        "intensity": "높음, 중간, 낮음 중 하나",
        "materials": ["재료1", "재료2"],
        "instructions": ["1단계 상세 설명", "2단계 설명", "3단계 설명"]
      }`;

      const aiResponse = await callGeminiAPI(prompt, true);
      
      const newPlay = {
        ...aiResponse,
        image: "https://images.unsplash.com/photo-1596461404969-9ce20c71c739?auto=format&fit=crop&w=400&q=80", 
        tagColor: aiResponse.tag?.includes("신체") ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
        isAiGenerated: true,
      };

      setGeneratedAiPlays(prev => [newPlay, ...prev]);
      setAiMaterialsInput('');
    } catch (error) {
      alert(`놀이를 생성하는 중 오류가 발생했어요.\n\n오류 내용: ${error.message}`);
    } finally {
      setIsGeneratingPlay(false);
    }
  };

  const handleGenerateAIFeedback = async () => {
    if (!diaryText.trim()) return;
    setIsGeneratingFeedback(true);
    setAiFeedbackText('');
    try {
      const prompt = `다음은 3세 아이 '${profile.name}'의 부모가 방금 작성한 육아 일기입니다:
      "${diaryText}"
      
      이 부모의 마음을 깊이 공감하고 위로하는 다정한 피드백(2~3문장)과, 이 일기 내용과 관련된 아주 작고 실용적인 육아 꿀팁 1가지를 작성해주세요. 
      딱딱한 텍스트가 아니라 부드럽고 따뜻한 대화체로 작성해주세요. 줄바꿈을 적절히 사용하세요.`;

      const responseText = await callGeminiAPI(prompt, false);
      setAiFeedbackText(responseText);
    } catch (error) {
      setAiFeedbackText(`앗, 멘토님과 연결에 실패했어요.\n원인: ${error.message}`);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!storyKeyword.trim()) return;
    setIsGeneratingStory(true);
    setGeneratedStory('');
    try {
      const prompt = `아이의 이름은 '${profile.name}'이고 나이는 3세입니다. 부모님이 입력한 키워드 '${storyKeyword}'를 주제로 하여, 잠들기 전 듣기 좋은 차분하고 따뜻한 1~2분 분량의 수면 유도 동화를 작성해주세요.
      동화의 주인공은 반드시 '${profile.name}'이어야 합니다. 
      자극적이지 않고 잠이 솔솔 올 수 있도록 다정하고 부드러운 구어체(해요체 등)를 사용하고, 줄바꿈을 예쁘게 적용해주세요.`;

      const responseText = await callGeminiAPI(prompt, false);
      setGeneratedStory(responseText);
    } catch (error) {
      setGeneratedStory(`동화를 만드는 중 오류가 발생했어요.\n\n오류 내용: ${error.message}`);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("음성 인식을 지원하지 않는 브라우저입니다. (Chrome/Safari 브라우저를 이용해주세요)");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ko-KR';
    recognition.interimResults = true; 
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceText('듣고 있어요...');
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setVoiceText(transcript);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => { setIsRecording(false); setVoiceText('음성 인식에 실패했어요. 다시 시도해주세요.'); };

    recognition.start();
    setShowRecordingUI(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  };

  const saveVoiceRecord = () => {
    if (voiceText && voiceText !== '듣고 있어요...' && voiceText !== '음성 인식에 실패했어요. 다시 시도해주세요.') {
      setRecords(prev => [{ id: Date.now().toString() + Math.random(), text: voiceText, time: new Date(), type: 'voice' }, ...prev]);
    }
    setShowRecordingUI(false);
    setVoiceText('');
  };

  const closeRecordingUI = () => {
    stopRecording();
    setShowRecordingUI(false);
    setVoiceText('');
  };

  const addMealRecord = () => setRecords(prev => [{ id: Date.now().toString() + Math.random(), text: '🍼 냠냠! 식사/간식 완료', time: new Date(), type: 'meal' }, ...prev]);
  const addSleepRecord = () => setRecords(prev => [{ id: Date.now().toString() + Math.random(), text: '💤 쿨쿨... 수면 시작', time: new Date(), type: 'sleep' }, ...prev]);
  
  const addDiaryRecord = () => {
    if (!diaryText.trim()) return;
    setRecords(prev => [{ id: Date.now().toString() + Math.random(), text: diaryText, time: new Date(), type: 'text' }, ...prev]);
    setDiaryText('');
    setAiFeedbackText(''); 
  };

  const deleteRecord = (id) => setRecords(prev => prev.filter(r => r.id !== id));
  const startEdit = (record) => { setEditingId(record.id); setEditText(record.text); };
  const saveEdit = (id) => { setRecords(prev => prev.map(r => r.id === id ? { ...r, text: editText } : r)); setEditingId(null); setEditText(''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleImageError = (e) => {
    e.target.src = "https://picsum.photos/400/300?blur=2"; 
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden text-slate-100">
      
      {currentView === 'home' && (
        <header className="p-6 pb-2 bg-slate-900">
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-3xl p-5 mb-3 flex items-center gap-4 border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-x-10 -translate-y-10 pointer-events-none"></div>
            <img 
              src="https://i.imgur.com/eoKsu9m.jpeg" 
              alt="지온이 사진" 
              onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Jion"; }} 
              className="w-16 h-16 object-cover object-center drop-shadow-md rounded-2xl border border-slate-600 bg-slate-700 relative z-10 shrink-0" 
            />
            <div className="text-left flex-1 relative z-10 py-1">
              <h1 className="text-lg font-bold text-white mb-1 leading-tight">안녕 {profile.name}!<br/>함께 놀이할까?</h1>
              <p className="text-slate-300 text-[11px] mt-1">오늘의 집중 활동: <span className="font-semibold text-yellow-400">감각 탐색 🧩</span></p>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center shrink-0 pr-1">
              <div className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-slate-900 font-bold mb-1 shadow-sm text-lg">N</div>
              <span className="font-bold text-white text-[10px] tracking-tight">NurturePlay</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 shadow-sm rounded-2xl py-3 px-5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                {currentSchedule.icon}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium mb-0.5">
                  현재 일과 (LA: {formatTime(laTime)})
                </p>
                <h2 className="text-base font-bold text-white">{currentSchedule.title}</h2>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto bg-slate-900 pb-24">
        {currentView === 'home' && (
          <div className="px-6">
            <div className="mt-4 mb-4">
              <h3 className="text-xl font-bold text-white">오늘의 추천 놀이</h3>
              <p className="text-xs text-slate-400 mt-1">36개월 미만 발달에 맞춘 큐레이션</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => { setSelectedActivity(todayPhysical); setCurrentView('detail'); }} className="bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-700 flex flex-col cursor-pointer hover:bg-slate-700 transition-all active:scale-95">
                <div className="relative h-44 w-full">
                  <img src={todayPhysical.image} alt={todayPhysical.title} onError={handleImageError} className="w-full h-full object-cover opacity-90"/>
                  <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold bg-green-900/80 text-green-300 shadow-sm backdrop-blur-sm`}>{todayPhysical.tag}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h4 className="font-bold text-white text-sm mb-2">{todayPhysical.title}</h4>
                  <div className="flex items-center text-xs text-slate-400 gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {todayPhysical.duration}</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {todayPhysical.intensity}</span>
                  </div>
                </div>
              </div>

              <div onClick={() => { setSelectedActivity(todaySensory); setCurrentView('detail'); }} className="bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-700 flex flex-col cursor-pointer hover:bg-slate-700 transition-all active:scale-95">
                <div className="relative h-44 w-full bg-slate-700">
                  <img src={todaySensory.image} alt={todaySensory.title} onError={handleImageError} className="w-full h-full object-cover opacity-80 mix-blend-luminosity"/>
                  <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold bg-yellow-900/80 text-yellow-300 shadow-sm backdrop-blur-sm`}>{todaySensory.tag}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h4 className="font-bold text-white text-sm mb-2">{todaySensory.title}</h4>
                  <div className="flex items-center text-xs text-slate-400 gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {todaySensory.duration}</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {todaySensory.intensity}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-white mb-4">빠른 기록</h3>
              <div className="flex gap-4">
                <button onClick={addMealRecord} className="flex-1 bg-slate-800 hover:bg-slate-700 transition-colors rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 border border-slate-700 active:scale-95">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shadow-sm"><span className="text-xl">🍽️</span></div>
                  <span className="text-sm font-semibold text-green-400">식사 기록</span>
                </button>
                <button onClick={addSleepRecord} className="flex-1 bg-slate-800 hover:bg-slate-700 transition-colors rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 border border-slate-700 active:scale-95">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shadow-sm"><span className="text-xl">💤</span></div>
                  <span className="text-sm font-semibold text-blue-400">수면 기록</span>
                </button>
                <button onClick={startRecording} className="flex-1 bg-slate-800 hover:bg-slate-700 transition-colors rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 border border-slate-700 active:scale-95">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shadow-sm"><Mic className="w-5 h-5 text-yellow-400" /></div>
                  <span className="text-sm font-semibold text-yellow-400">음성 기록</span>
                </button>
              </div>

              <button onClick={() => setShowStoryModal(true)} className="w-full mt-4 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/60 hover:to-purple-800/60 transition-colors rounded-2xl p-4 flex items-center justify-between border border-indigo-500/30 active:scale-95 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center shadow-sm">
                    <Moon className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-indigo-200 block">마법의 AI 잠자리 동화</span>
                    <span className="text-xs text-indigo-300/70">{profile.name}가 주인공인 수면 동화 만들기</span>
                  </div>
                </div>
                <Wand2 className="w-5 h-5 text-indigo-400 opacity-50" />
              </button>
            </div>

            {records.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-4">최근 활동 기록</h3>
                <div className="space-y-3">
                  {records.map((record) => (
                    <div key={record.id} className="bg-slate-800 py-5 px-4 rounded-2xl shadow-sm border border-slate-700 flex items-center gap-4">
                      {record.type === 'meal' && <div className="shrink-0 w-8 h-8 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 text-sm">🍽️</div>}
                      {record.type === 'sleep' && <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-sm">💤</div>}
                      {record.type === 'voice' && <div className="shrink-0 w-8 h-8 rounded-full bg-yellow-900/50 flex items-center justify-center text-yellow-400"><Mic className="w-4 h-4" /></div>}
                      {record.type === 'text' && <div className="shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><BookOpen className="w-4 h-4" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm truncate">
                          <span className="mr-2">{record.text}</span>
                          <span className="text-xs text-slate-500">{formatTime(record.time)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'library' && (
          <div className="px-6 pt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">놀이 보관함</h2>
            </div>
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-5 rounded-3xl shadow-lg border border-indigo-500/30 mb-8 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-white text-lg">AI 맞춤 놀이 뚝딱!</h3>
              </div>
              <p className="text-indigo-200 text-xs mb-4 relative z-10">집에 있는 재료를 알려주시면, {profile.name}만을 위한 창의적인 놀이를 만들어드려요.</p>
              <div className="flex gap-2 relative z-10">
                <input type="text" value={aiMaterialsInput} onChange={(e) => setAiMaterialsInput(e.target.value)} placeholder="예: 빈 휴지심, 색종이, 스티커" className="flex-1 bg-slate-900/80 text-white text-sm rounded-xl p-3 border border-indigo-500/50 focus:outline-none focus:border-yellow-400 placeholder:text-slate-500" />
                <button onClick={handleGenerateAIPlay} disabled={isGeneratingPlay || !aiMaterialsInput.trim()} className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-700 text-slate-900 font-bold px-4 rounded-xl transition-colors flex items-center justify-center shrink-0">
                  {isGeneratingPlay ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {generatedAiPlays.map((activity, idx) => (
                <div key={`ai-${idx}`} onClick={() => { setSelectedActivity(activity); setCurrentView('detail'); }} className="bg-slate-800 p-4 rounded-2xl shadow-sm border border-purple-500/30 flex gap-4 items-center cursor-pointer hover:bg-slate-700 transition-colors relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  <img src={activity.image} alt={activity.title} onError={handleImageError} className="w-20 h-20 rounded-xl object-cover opacity-90" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activity.tagColor}`}>{activity.tag}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-full"><Sparkles className="w-3 h-3" /> AI 추천</span>
                    </div>
                    <h4 className="font-bold text-white text-md mt-1">{activity.title}</h4>
                    <div className="flex items-center text-xs text-slate-400 gap-3 mt-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.duration}</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {activity.intensity}</span>
                    </div>
                  </div>
                </div>
              ))}
              {[...physicalActivities, ...sensoryActivities].map((activity, idx) => (
                <div key={`base-${idx}`} onClick={() => { setSelectedActivity(activity); setCurrentView('detail'); }} className="bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-700 flex gap-4 items-center cursor-pointer hover:bg-slate-700 transition-colors">
                  <img src={activity.image} alt={activity.title} onError={handleImageError} className="w-20 h-20 rounded-xl object-cover opacity-90" />
                  <div className="flex-1">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${activity.tag === '신체 활동' ? 'bg-green-900/80 text-green-300' : 'bg-yellow-900/80 text-yellow-300'}`}>{activity.tag}</span>
                    <h4 className="font-bold text-white text-md mt-1">{activity.title}</h4>
                    <div className="flex items-center text-xs text-slate-400 gap-3 mt-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.duration}</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {activity.intensity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'detail' && selectedActivity && (
          <div className="pb-10 relative">
            <div className="relative h-64 w-full">
              <img src={selectedActivity.image} alt={selectedActivity.title} onError={handleImageError} className="w-full h-full object-cover opacity-80" />
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-900/90 to-transparent"></div>
              <button onClick={() => setCurrentView('library')} className="absolute top-6 left-6 w-10 h-10 bg-slate-800/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 pt-8 bg-slate-900 rounded-t-3xl -mt-6 relative z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedActivity.tagColor}`}>{selectedActivity.tag}</span>
                {selectedActivity.isAiGenerated && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full border border-purple-500/30"><Sparkles className="w-3 h-3" /> AI가 만든 놀이</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedActivity.title}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-700">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedActivity.duration}</span>
                <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-400" /> {selectedActivity.intensity}</span>
              </div>
              <h3 className="font-bold text-white text-lg mb-4">준비물</h3>
              <ul className="space-y-3 mb-8 bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
                {selectedActivity.materials.map((material, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-[-1px]" />{material}</li>
                ))}
              </ul>
              <h3 className="font-bold text-white text-lg mb-4">부모님 가이드 (진행 방법)</h3>
              <div className="bg-slate-800 p-6 rounded-2xl text-slate-300 text-sm leading-relaxed border border-slate-700 shadow-sm space-y-5">
                {selectedActivity.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-3"><span className="font-bold text-slate-900 bg-yellow-400 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0">{idx + 1}</span><p className="pt-0.5">{step}</p></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'diary' && (
          <div className="px-6 pt-8">
            <h2 className="text-2xl font-bold text-white mb-6">성장 일기</h2>
            <div className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700 mb-8 relative">
              <textarea value={diaryText} onChange={(e) => setDiaryText(e.target.value)} placeholder={`오늘 ${profile.name}의 빛나는 순간을 기록해보세요...`} className="w-full bg-slate-900 text-white text-sm rounded-2xl p-4 border border-slate-600 focus:outline-none focus:border-yellow-400 resize-none min-h-[120px] mb-4 leading-relaxed" />
              <div className="flex gap-2">
                <button onClick={handleGenerateAIFeedback} disabled={!diaryText.trim() || isGeneratingFeedback} className="flex-1 py-3 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {isGeneratingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                  {isGeneratingFeedback ? '멘토가 읽고 있어요...' : 'AI 멘토 조언 듣기'}
                </button>
                <button onClick={addDiaryRecord} disabled={!diaryText.trim()} className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <BookOpen className="w-5 h-5" /> 일기 저장하기
                </button>
              </div>
              {aiFeedbackText && (
                <div className="mt-4 p-5 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-indigo-500/40 rounded-2xl relative">
                  <div className="absolute -top-3 left-6 bg-slate-900 px-2 text-indigo-400 font-bold text-xs flex items-center gap-1"><Sparkles className="w-3 h-3" /> 오은영st AI 멘토</div>
                  <p className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap mt-2">{aiFeedbackText}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-bold text-white">전체 기록 모아보기</h3>
                <span className="text-xs text-slate-400">총 {records.length}개</span>
              </div>
              {records.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">아직 작성된 기록이 없어요.</div>
              ) : (
                records.map((record) => (
                  <div key={record.id} className="bg-slate-800 py-5 px-4 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-between gap-4">
                      {record.type === 'meal' && <div className="shrink-0 w-8 h-8 rounded-full bg-green-900/50 flex items-center justify-center text-green-400 text-sm">🍽️</div>}
                      {record.type === 'sleep' && <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-sm">💤</div>}
                      {record.type === 'voice' && <div className="shrink-0 w-8 h-8 rounded-full bg-yellow-900/50 flex items-center justify-center text-yellow-400"><Mic className="w-4 h-4" /></div>}
                      {record.type === 'text' && <div className="shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><BookOpen className="w-4 h-4" /></div>}
                      
                      {editingId === record.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 bg-slate-900 text-white text-sm rounded-lg p-2 border border-slate-600 focus:outline-none focus:border-yellow-400" autoFocus />
                          <button onClick={() => saveEdit(record.id)} className="p-1.5 text-green-400 hover:bg-slate-700 rounded transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-red-400 hover:bg-slate-700 rounded transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 text-sm truncate w-full">
                              <span className="mr-2">{record.text}</span>
                              <span className="text-xs text-slate-500">{formatTime(record.time)}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(record)} className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteRecord(record.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <div className="px-6 pt-8 pb-10">
            <h2 className="text-2xl font-bold text-white mb-6">아이 프로필</h2>
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-lg flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-900/30 to-transparent pointer-events-none"></div>
              <img 
                src="https://i.imgur.com/eoKsu9m.jpeg" 
                alt="지온이 프로필" 
                onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Jion"; }} 
                className="w-28 h-28 object-cover object-center rounded-full border-4 border-slate-700 mb-5 shadow-lg relative z-10 bg-slate-900" 
              />
              {isEditingProfile ? (
                <div className="w-full space-y-4 relative z-10">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">이름</label>
                    <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full bg-slate-900 text-white rounded-xl p-3 border border-slate-600 focus:outline-none focus:border-yellow-400 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">생년월일</label>
                    <input type="date" value={profile.birthDate} onChange={(e) => setProfile({...profile, birthDate: e.target.value})} className="w-full bg-slate-900 text-white rounded-xl p-3 border border-slate-600 focus:outline-none focus:border-yellow-400 transition-colors" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">키 (cm)</label>
                      <input type="number" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full bg-slate-900 text-white rounded-xl p-3 border border-slate-600 focus:outline-none focus:border-yellow-400 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">몸무게 (kg)</label>
                      <input type="number" value={profile.weight} onChange={(e) => setProfile({...profile, weight: e.target.value})} className="w-full bg-slate-900 text-white rounded-xl p-3 border border-slate-600 focus:outline-none focus:border-yellow-400 transition-colors" />
                    </div>
                  </div>
                  <button onClick={() => setIsEditingProfile(false)} className="w-full py-3 mt-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl transition-colors shadow-md">저장하기</button>
                </div>
              ) : (
                <div className="w-full relative z-10">
                  <h3 className="text-2xl font-bold text-white text-center mb-6">{profile.name}</h3>
                  <div className="bg-slate-900 rounded-2xl p-5 space-y-4 border border-slate-700">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                      <span className="text-slate-400 text-sm font-medium">생년월일</span><span className="text-white">{profile.birthDate}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                      <span className="text-slate-400 text-sm font-medium">키</span><span className="text-white">{profile.height} cm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm font-medium">몸무게</span><span className="text-white">{profile.weight} kg</span>
                    </div>
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="w-full py-3 mt-6 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"><Pencil className="w-4 h-4" /> 프로필 수정하기</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="absolute bottom-0 w-full bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center pb-safe z-50">
        <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'home' ? '' : 'text-slate-500 hover:text-slate-300 transition-colors'}`}>
          <div className={currentView === 'home' ? 'bg-slate-800 p-2 rounded-xl' : 'p-2'}><Home className={`w-6 h-6 ${currentView === 'home' ? 'text-yellow-400' : ''}`} /></div><span className={`text-[10px] ${currentView === 'home' ? 'font-bold text-yellow-400' : 'font-medium'}`}>홈</span>
        </button>
        <button onClick={() => setCurrentView('library')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'library' ? '' : 'text-slate-500 hover:text-slate-300 transition-colors'}`}>
          <div className={currentView === 'library' ? 'bg-slate-800 p-2 rounded-xl' : 'p-2'}><Box className={`w-6 h-6 ${currentView === 'library' ? 'text-yellow-400' : ''}`} /></div><span className={`text-[10px] ${currentView === 'library' ? 'font-bold text-yellow-400' : 'font-medium'}`}>놀이보관함</span>
        </button>
        <button onClick={() => setCurrentView('diary')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'diary' ? '' : 'text-slate-500 hover:text-slate-300 transition-colors'}`}>
          <div className={currentView === 'diary' ? 'bg-slate-800 p-2 rounded-xl' : 'p-2'}><BookOpen className={`w-6 h-6 ${currentView === 'diary' ? 'text-yellow-400' : ''}`} /></div><span className={`text-[10px] ${currentView === 'diary' ? 'font-bold text-yellow-400' : 'font-medium'}`}>성장일기</span>
        </button>
        <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'profile' ? '' : 'text-slate-500 hover:text-slate-300 transition-colors'}`}>
          <div className={currentView === 'profile' ? 'bg-slate-800 p-2 rounded-xl' : 'p-2'}><User className={`w-6 h-6 ${currentView === 'profile' ? 'text-yellow-400' : ''}`} /></div><span className={`text-[10px] ${currentView === 'profile' ? 'font-bold text-yellow-400' : 'font-medium'}`}>프로필</span>
        </button>
      </nav>

      {showRecordingUI && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center px-6">
          <div className="bg-slate-800 w-full rounded-3xl p-6 flex flex-col items-center relative border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
            <button onClick={closeRecordingUI} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            <h3 className="text-lg font-bold text-white mb-6">놀이 음성 기록</h3>
            <div className="relative mb-8">
              {isRecording && (<><div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div><div className="absolute inset-[-10px] bg-yellow-400 rounded-full animate-pulse opacity-10"></div></>)}
              <button onClick={isRecording ? stopRecording : startRecording} className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${isRecording ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-400'}`}><Mic className="w-10 h-10" /></button>
            </div>
            <div className="w-full bg-slate-900 rounded-2xl p-4 min-h-[80px] flex items-center justify-center border border-slate-700 mb-6 text-center">
              <p className={`text-sm ${isRecording ? 'text-white font-medium' : 'text-slate-400'}`}>{voiceText || (isRecording ? '듣고 있어요...' : '마이크를 눌러 말해주세요')}</p>
            </div>
            <button onClick={saveVoiceRecord} disabled={!voiceText || voiceText === '듣고 있어요...' || voiceText === '음성 인식에 실패했어요. 다시 시도해주세요.'} className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold rounded-xl transition-colors">기록 저장하기</button>
          </div>
        </div>
      )}

      {showStoryModal && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex flex-col px-6 pt-16 pb-8 animate-in fade-in zoom-in duration-200">
          <button onClick={() => {setShowStoryModal(false); setGeneratedStory(''); setStoryKeyword('');}} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Moon className="w-6 h-6 text-yellow-400" /> 마법의 AI 동화책</h3>
          <p className="text-slate-400 text-sm mb-6">원하는 주제를 입력하시면 {profile.name}가 주인공이 되어 등장하는 1분 수면 동화를 즉석에서 만들어드려요.</p>
          <div className="flex gap-2 mb-6">
            <input type="text" value={storyKeyword} onChange={(e) => setStoryKeyword(e.target.value)} placeholder="예: 공룡, 밤하늘, 자동차, 토끼" className="flex-1 bg-slate-800 text-white text-sm rounded-xl p-4 border border-slate-700 focus:outline-none focus:border-indigo-400" />
            <button onClick={handleGenerateStory} disabled={!storyKeyword.trim() || isGeneratingStory} className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-5 rounded-xl transition-colors flex items-center justify-center shrink-0 shadow-lg">{isGeneratingStory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}</button>
          </div>
          <div className="flex-1 bg-slate-800 rounded-3xl p-5 border border-slate-700 shadow-inner overflow-y-auto">
            {isGeneratingStory ? (
              <div className="flex flex-col items-center justify-center h-full text-indigo-300 gap-3"><Loader2 className="w-10 h-10 animate-spin" /><p className="text-sm animate-pulse font-medium">따뜻한 동화를 짓고 있어요...</p></div>
            ) : generatedStory ? (
              <p className="text-slate-200 text-sm leading-8 whitespace-pre-wrap">{generatedStory}</p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3"><BookOpen className="w-12 h-12 opacity-50" /><p className="text-sm text-center leading-relaxed">오늘은 어떤 이야기를 들려줄까요?<br/>위 빈칸에 키워드를 하나만 입력해보세요!</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;