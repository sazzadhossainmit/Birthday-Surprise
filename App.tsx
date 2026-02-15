
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { BirthdayState } from './types';
import { IMAGES, DEFAULT_WISH } from './constants';
import { generateBirthdayWish, generateBirthdayStory } from './services/geminiService';

type Tab = 'home' | 'story' | 'album' | 'config';

const DEFAULT_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const App: React.FC = () => {
  const [state, setState] = useState<BirthdayState>({
    recipientName: '',
    isMusicPlaying: false,
    isGiftOpened: false,
    generatedWish: DEFAULT_WISH,
    isLoadingWish: false,
    volume: 0.5,
    memories: [IMAGES.ALEX_CELEBRATION, IMAGES.GALLERY_CAKE, IMAGES.GALLERY_CONFETTI, IMAGES.HERO_BALLOONS],
    customAudioUrl: null,
  });

  const [activeTab, setActiveTab] = useState<Tab>('home');
  // Dark mode enabled by default
  const [darkMode, setDarkMode] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [story, setStory] = useState<string>('');
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    const savedName = localStorage.getItem('birthday_recipient');
    const savedMemories = localStorage.getItem('birthday_memories');
    const savedVolume = localStorage.getItem('birthday_volume');
    const savedDarkMode = localStorage.getItem('birthday_darkmode');

    if (savedName) setState(s => ({ ...s, recipientName: savedName }));
    if (savedMemories) {
      try {
        setState(s => ({ ...s, memories: JSON.parse(savedMemories) }));
      } catch (e) {
        console.error("Failed to parse memories", e);
      }
    }
    if (savedVolume) setState(s => ({ ...s, volume: parseFloat(savedVolume) }));
    // Only override default true if explicitly saved as false
    if (savedDarkMode === 'false') setDarkMode(false);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('birthday_darkmode', darkMode.toString());
  }, [darkMode]);

  // Autoplay logic for carousel
  useEffect(() => {
    let interval: any;
    if (autoplay && activeTab === 'home' && state.memories.length > 1 && carouselRef.current) {
      interval = setInterval(() => {
        if (!carouselRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        // Check if we are at the end
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: clientWidth * 0.8, behavior: 'smooth' });
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [autoplay, activeTab, state.memories]);

  // Audio Control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      if (state.isMusicPlaying) {
        audioRef.current.play().catch(e => {
          console.warn("Playback blocked. Interaction required.", e);
          setState(s => ({ ...s, isMusicPlaying: false }));
        });
      } else {
        audioRef.current.pause();
      }
    }
    localStorage.setItem('birthday_volume', state.volume.toString());
  }, [state.isMusicPlaying, state.volume, state.customAudioUrl]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setState(prev => ({ ...prev, recipientName: name }));
    localStorage.setItem('birthday_recipient', name);
  };

  const toggleMusic = () => {
    setState(prev => ({ ...prev, isMusicPlaying: !prev.isMusicPlaying }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setState(prev => ({ ...prev, volume: vol }));
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, customAudioUrl: url, isMusicPlaying: true }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newMemories = [base64String, ...state.memories];
        setState(prev => ({ ...prev, memories: newMemories }));
        localStorage.setItem('birthday_memories', JSON.stringify(newMemories));
        // Force scroll to start to see new image
        setTimeout(() => {
          if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const openGift = async () => {
    if (state.isGiftOpened) {
      triggerConfetti();
      return;
    }
    setState(prev => ({ ...prev, isLoadingWish: true }));
    const wish = await generateBirthdayWish(state.recipientName);
    setState(prev => ({ ...prev, isGiftOpened: true, generatedWish: wish, isLoadingWish: false }));
    triggerConfetti();
  };

  const fetchStory = async () => {
    if (story && !confirm("Generate a new legend?")) return;
    setIsLoadingStory(true);
    const res = await generateBirthdayStory(state.recipientName);
    setStory(res);
    setIsLoadingStory(false);
  };

  const addMemoryByUrl = () => {
    const url = prompt("Enter an image URL:");
    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
      const newMemories = [url, ...state.memories];
      setState(prev => ({ ...prev, memories: newMemories }));
      localStorage.setItem('birthday_memories', JSON.stringify(newMemories));
      setTimeout(() => {
        if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleShare = async () => {
    const text = `🎉 Birthday Surprise for ${state.recipientName || 'you'}: "${state.generatedWish}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Birthday Surprise', text, url: window.location.href });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      alert("Copied to clipboard! 🎂");
    } catch (err) {
      alert(content);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pb-24 relative overflow-x-hidden transition-colors duration-500 bg-background-light dark:bg-background-dark">
      <audio ref={audioRef} loop src={state.customAudioUrl || DEFAULT_AUDIO} />
      
      {/* Hidden Inputs */}
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      
      <div className="fixed inset-0 confetti-bg pointer-events-none z-0"></div>
      
      <header className="sticky top-0 w-full max-w-md z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-primary/10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl animate-bounce-slow">cake</span>
          <h2 className="font-extrabold text-xl tracking-tight text-[#171115] dark:text-white">Celebration.</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="bg-primary/5 dark:bg-primary/20 p-2 rounded-full transition-all active:scale-90">
            <span className="material-symbols-outlined text-primary">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onClick={handleShare} className="bg-primary/5 dark:bg-primary/20 p-2 rounded-full transition-all active:scale-90">
            <span className="material-symbols-outlined text-primary">share</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-md px-6 pt-8 space-y-8 z-10 overflow-y-auto pb-8">
        
        {activeTab === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <section className="text-center space-y-4">
              <div className="inline-block bg-primary/10 dark:bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
                Happy Birthday!
              </div>
              <h1 className="text-4xl font-extrabold leading-tight text-[#171115] dark:text-white">
                Celebrate, <br/>
                <span className="text-primary italic">
                  {state.recipientName || 'Special One!'}
                </span>
              </h1>
            </section>

            {/* Portrait Image Carousel */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                   <h3 className="text-sm font-bold text-[#171115] dark:text-white uppercase tracking-wider">Memories</h3>
                   {autoplay && <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => imageInputRef.current?.click()} className="text-[10px] font-bold text-primary hover:brightness-90 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full transition-all">
                    <span className="material-symbols-outlined text-sm">add_photo_alternate</span> Upload
                  </button>
                  <button onClick={addMemoryByUrl} className="text-[10px] font-bold text-gray-500 hover:brightness-90 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full transition-all">
                    <span className="material-symbols-outlined text-sm">add_link</span> URL
                  </button>
                </div>
              </div>
              <div ref={carouselRef} className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 no-scrollbar">
                {state.memories.map((img, i) => (
                  <div key={i} className="snap-center shrink-0 w-[70%] aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 relative group transition-transform duration-500 hover:scale-[1.02]">
                    <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Carousel ${i}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const nm = state.memories.filter((_, idx) => idx !== i);
                        setState(s => ({...s, memories: nm}));
                        localStorage.setItem('birthday_memories', JSON.stringify(nm));
                      }}
                      className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur-lg rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-lg"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                {state.memories.length === 0 && (
                  <div onClick={() => imageInputRef.current?.click()} className="snap-center shrink-0 w-full aspect-[2/3] rounded-3xl border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-5xl mb-3">photo_library</span>
                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Add your first memory</p>
                  </div>
                )}
              </div>
            </section>

            {/* Surprise Gift Reveal */}
            <section>
              <div 
                className={`relative overflow-hidden rounded-3xl p-10 text-center transition-all duration-700 ${
                  state.isGiftOpened 
                    ? 'bg-white dark:bg-gray-800/50 border-2 border-primary/20 shadow-xl' 
                    : 'bg-gradient-to-br from-primary to-[#ff6fb1] text-white shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95 shadow-primary/20'
                }`}
                onClick={openGift}
              >
                {state.isLoadingWish ? (
                  <div className="py-10 space-y-4">
                    <div className="animate-spin text-white inline-block">
                      <span className="material-symbols-outlined text-6xl">celebration</span>
                    </div>
                    <p className="font-bold tracking-widest uppercase text-sm">Preparing Your Wish...</p>
                  </div>
                ) : state.isGiftOpened ? (
                  <div className="space-y-6 animate-in zoom-in duration-500">
                    <span className="material-symbols-outlined text-primary text-7xl opacity-50">format_quote</span>
                    <p className="text-2xl italic font-semibold text-[#171115] dark:text-white/90 leading-relaxed px-4">
                      "{state.generatedWish}"
                    </p>
                    <div className="flex flex-col items-center gap-4 mt-6">
                      <button onClick={(e) => { e.stopPropagation(); triggerConfetti() }} className="bg-primary text-white text-xs font-bold px-8 py-3 rounded-full uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30">More Magic! ✨</button>
                      <button onClick={(e) => { e.stopPropagation(); setState(s => ({...s, isGiftOpened: false}))}} className="text-[10px] text-primary/40 font-bold uppercase tracking-[0.2em] hover:opacity-100 transition-opacity">Reset Gift Box</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center animate-bounce shadow-inner">
                      <span className="material-symbols-outlined text-6xl">card_giftcard</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight">Open Your Gift</h3>
                      <p className="text-white/70 text-sm font-medium">A personalized AI surprise awaits inside!</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Music Player Bar */}
            <section>
              <div className="bg-white dark:bg-gray-800/40 rounded-3xl p-6 shadow-sm border border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-500 ${state.isMusicPlaying ? 'bg-primary text-white shadow-xl shadow-primary/30 rotate-3 scale-110' : 'bg-primary/10 text-primary'}`}>
                    <span className={`material-symbols-outlined text-3xl ${state.isMusicPlaying ? 'animate-spin-slow' : ''}`}>{state.isMusicPlaying ? 'album' : 'music_note'}</span>
                  </div>
                  <div className="max-w-[140px]">
                    <h3 className="font-bold text-base dark:text-white truncate">{state.customAudioUrl ? 'Your Track' : 'Birthday Mix'}</h3>
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mt-1">{state.isMusicPlaying ? 'Vibing' : 'Paused'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => audioInputRef.current?.click()} className="p-3.5 rounded-full bg-primary/10 text-primary active:scale-90 transition-all hover:bg-primary/20" title="Select custom song">
                      <span className="material-symbols-outlined text-xl">music_video</span>
                   </button>
                   <button onClick={toggleMusic} className={`px-8 py-3 rounded-full font-bold text-xs transition-all tracking-widest uppercase ${state.isMusicPlaying ? 'bg-primary/10 text-primary' : 'bg-primary text-white shadow-xl shadow-primary/20 active:scale-95'}`}>
                    {state.isMusicPlaying ? 'Stop' : 'Play'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <h2 className="text-3xl font-extrabold text-[#171115] dark:text-white">The Legend of {state.recipientName || 'You'}</h2>
            <div className="bg-white dark:bg-gray-800/50 p-10 rounded-[2.5rem] border border-gold/20 shadow-2xl relative min-h-[400px] flex flex-col justify-center overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                 <span className="material-symbols-outlined text-[10rem] text-gold animate-pulse">auto_stories</span>
               </div>
               {isLoadingStory ? (
                 <div className="py-20 text-center space-y-6">
                   <div className="animate-spin text-gold inline-block"><span className="material-symbols-outlined text-5xl">history_edu</span></div>
                   <p className="text-sm font-black text-gold uppercase tracking-[0.3em]">Weaving the saga...</p>
                 </div>
               ) : story ? (
                 <div className="space-y-6 relative z-10 animate-in zoom-in duration-700">
                   <p className="text-xl leading-relaxed dark:text-gray-200 italic font-medium border-l-4 border-gold/30 pl-6">"{story}"</p>
                   <div className="flex gap-4 pt-8">
                    <button onClick={fetchStory} className="flex-1 bg-gold/10 text-gold text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] hover:bg-gold/20 transition-all">Rewrite</button>
                    <button onClick={() => copyToClipboard(story)} className="flex-1 bg-primary/10 text-primary text-[10px] font-black py-4 rounded-2xl uppercase tracking-[0.2em] hover:bg-primary/20 transition-all">Share Story</button>
                   </div>
                 </div>
               ) : (
                 <div className="py-10 text-center space-y-8">
                   <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <span className="material-symbols-outlined text-gold text-5xl">auto_fix_high</span>
                   </div>
                   <p className="text-[#876478] dark:text-gray-400 font-semibold text-lg max-w-[240px] mx-auto">Gemini is ready to write a legendary tale for your birthday.</p>
                   <button onClick={fetchStory} className="bg-gold text-white px-12 py-4 rounded-full font-bold shadow-2xl shadow-gold/40 active:scale-95 transition-all text-sm tracking-widest uppercase">Start the Saga</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'album' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold text-[#171115] dark:text-white">The Collection</h2>
              <button 
                onClick={() => { if(confirm("Permanently erase the collection?")) { setState(s => ({...s, memories: []})); localStorage.removeItem('birthday_memories'); }}}
                className="text-[10px] text-primary/40 font-black uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {state.memories.map((img, i) => (
                <div key={i} className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white dark:border-gray-800 relative group">
                  <img src={img} className="w-full h-full object-cover" alt={`Album ${i}`} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                    <button onClick={() => { const nm = state.memories.filter((_, idx) => idx !== i); setState(s => ({...s, memories: nm})); localStorage.setItem('birthday_memories', JSON.stringify(nm)); }} className="bg-white/20 hover:bg-red-500 p-4 rounded-full text-white transition-all transform scale-75 group-hover:scale-100 shadow-2xl border border-white/20">
                      <span className="material-symbols-outlined text-2xl">delete_forever</span>
                    </button>
                  </div>
                </div>
              ))}
              <div onClick={() => imageInputRef.current?.click()} className="aspect-[3/4] rounded-[2rem] border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 active:scale-95 transition-all group">
                <span className="material-symbols-outlined text-primary text-5xl mb-2 group-hover:scale-110 transition-transform">add_a_photo</span>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Add Photo</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <h2 className="text-3xl font-extrabold text-[#171115] dark:text-white">Celebration Settings</h2>
            <div className="space-y-4">
               {/* Recipient Name */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-primary/5 shadow-sm space-y-4">
                 <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Recipient Identity</label>
                 <input 
                  type="text" 
                  value={state.recipientName} 
                  onChange={handleNameChange}
                  className="w-full h-14 bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl font-bold dark:text-white focus:ring-2 focus:ring-primary/40 px-6 transition-all"
                  placeholder="Name of the star..."
                 />
               </div>

               {/* Carousel Features */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-primary/5 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">view_carousel</span>
                   </div>
                   <div>
                    <h3 className="font-bold dark:text-white text-sm">Autoplay Carousel</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{autoplay ? 'Cycle active' : 'Manual scroll'}</p>
                   </div>
                 </div>
                 <button onClick={() => setAutoplay(!autoplay)} className={`w-14 h-7 rounded-full transition-all ${autoplay ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-gray-200 dark:bg-gray-700'} relative shadow-inner`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${autoplay ? 'left-8' : 'left-1'}`}></div>
                 </button>
               </div>

               {/* Custom Song Selector */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-primary/5 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">audiotrack</span>
                   </div>
                   <div>
                    <h3 className="font-bold dark:text-white text-sm">Celebration Song</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{state.customAudioUrl ? 'User Track' : 'Standard'}</p>
                   </div>
                 </div>
                 <button onClick={() => audioInputRef.current?.click()} className="bg-primary text-white text-[10px] font-black px-5 py-3 rounded-full uppercase tracking-widest shadow-xl shadow-primary/20 transition-transform active:scale-95">Update</button>
               </div>

               {/* Volume & Theme */}
               <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-primary/5 shadow-sm space-y-6">
                 <div className="flex items-center justify-between">
                    <span className="font-black dark:text-white text-[10px] uppercase tracking-widest">Atmosphere Volume</span>
                    <span className="text-[10px] font-black text-primary">{Math.round(state.volume * 100)}%</span>
                 </div>
                 <input type="range" min="0" max="1" step="0.01" value={state.volume} onChange={handleVolumeChange} className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none accent-primary cursor-pointer" />
                 
                 <div className="h-px bg-gray-100 dark:bg-gray-700" />
                 
                 <div className="flex items-center justify-between">
                   <span className="font-bold dark:text-white text-sm">Night Celebration</span>
                   <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-7 rounded-full transition-all ${darkMode ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-gray-200 dark:bg-gray-700'} relative shadow-inner`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${darkMode ? 'left-8' : 'left-1'}`}></div>
                   </button>
                 </div>
               </div>

               <button onClick={() => { if(confirm("Reset all memories and settings? This cannot be undone.")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-6 text-red-500 font-black text-[10px] uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-all hover:bg-red-500/5 rounded-2xl">Purge All App Data</button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#171115]/95 backdrop-blur-2xl border-t border-primary/10 px-8 py-4 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] safe-bottom">
        <NavItem icon="home" label="HOME" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon="auto_stories" label="STORY" active={activeTab === 'story'} onClick={() => setActiveTab('story')} />
        <div className="relative -top-10 group">
          <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <button onClick={openGift} className="relative w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(227,49,153,0.4)] border-4 border-background-light dark:border-[#171115] hover:scale-110 active:scale-95 transition-all z-10">
            <span className="material-symbols-outlined text-5xl fill-1 animate-pulse">celebration</span>
          </button>
        </div>
        <NavItem icon="photo_library" label="ALBUM" active={activeTab === 'album'} onClick={() => setActiveTab('album')} />
        <NavItem icon="tune" label="CONFIG" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-gray-400 opacity-60 hover:opacity-100'}`}>
    <span className={`material-symbols-outlined text-2xl ${active ? 'fill-1' : ''}`}>{icon}</span>
    <span className="text-[9px] font-black tracking-[0.15em] uppercase">{label}</span>
    {active && <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>}
  </button>
);

export default App;
