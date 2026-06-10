import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, Clock, Sparkles, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DailyReminderProps {
  onNotifyInApp?: (title: string, message: string) => void;
}

export const DailyReminder: React.FC<DailyReminderProps> = ({ onNotifyInApp }) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>("08:00"); // Standard hh:mm
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [showTestSuccess, setShowTestSuccess] = useState<boolean>(false);
  const [simulatedNotification, setSimulatedNotification] = useState<{title: string, body: string} | null>(null);

  // Parse hour/minute
  const [hour, min] = reminderTime.split(':').map(Number);

  // Check initial state & permissions
  useEffect(() => {
    // Check localStorage
    const savedEnabled = localStorage.getItem('bible_reminder_enabled') === 'true';
    const savedTime = localStorage.getItem('bible_reminder_time') || "08:00";
    
    setEnabled(savedEnabled);
    setReminderTime(savedTime);

    if (!('Notification' in window)) {
      setPermissionStatus('unsupported');
    } else {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Save when changed
  const handleToggle = async () => {
    const nextState = !enabled;
    
    if (nextState) {
      // Request permissions
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission !== 'granted') {
          // Fallback message
          triggerInAppToast(
            "Notifications système désactivées", 
            "La permission a été refusée. Nous utiliserons des alertes visuelles interactives directement dans l'application."
          );
        }
      } else {
        setPermissionStatus('unsupported');
      }
    }

    setEnabled(nextState);
    localStorage.setItem('bible_reminder_enabled', String(nextState));
  };

  const handleTimeChange = (type: 'hour' | 'minute', action: 'inc' | 'dec') => {
    let [h, m] = reminderTime.split(':').map(Number);
    if (type === 'hour') {
      h = action === 'inc' ? (h + 1) % 24 : (h - 1 + 24) % 24;
    } else {
      m = action === 'inc' ? (m + 5) % 60 : (m - 5 + 60) % 60;
    }
    
    const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setReminderTime(newTime);
    localStorage.setItem('bible_reminder_time', newTime);
  };

  // Setup the live background reminders checker
  useEffect(() => {
    if (!enabled) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentS = now.getSeconds();

      // Check if current hour & minute matches, and seconds are near 0 to trigger once
      const [targetH, targetM] = reminderTime.split(':').map(Number);
      if (currentH === targetH && currentM === targetM && currentS === 0) {
        triggerDailyReminderNotification();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [enabled, reminderTime]);

  const triggerDailyReminderNotification = () => {
    const title = "Halte Spirituelle Absolue";
    const body = "L'Heure divine a sonné ! Poursuivez votre défi quotidien de lecture sainte.";

    // 1. Try native Web Notification
    if (permissionStatus === 'granted' && 'Notification' in window) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'bible-daily-reminder',
        });
      } catch (e) {
        console.warn("Failed to dispatch desktop notification", e);
      }
    }

    // 2. Always show native styled premium modal/banner inside application
    setSimulatedNotification({ title, body });
    if (onNotifyInApp) {
      onNotifyInApp(title, body);
    }
  };

  const triggerInAppToast = (title: string, body: string) => {
    setSimulatedNotification({ title, body });
  };

  const handleTestNotification = async () => {
    // Force prompt permission if default
    if ('Notification' in window && Notification.permission === 'default') {
      const status = await Notification.requestPermission();
      setPermissionStatus(status);
    }

    const title = "🔔 RAPPEL TEST — Succès !";
    const body = `Fidélité confirmée : vos rappels quotidiens sont programmés à ${reminderTime}.`;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          tag: 'bible-test-reminder'
        });
      } catch (e) {
        console.warn("Notification construct error", e);
      }
    }

    setSimulatedNotification({ title, body });
    setShowTestSuccess(true);
    setTimeout(() => {
      setShowTestSuccess(false);
    }, 4000);
  };

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4.5 space-y-4 select-none relative overflow-hidden">
      
      {/* Visual ambient golden light glow behind bell */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl"></div>

      {/* Title block with bell */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition-all ${
            enabled ? 'bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]' : 'bg-[#1a1712] border-[#2e2a1e] text-[#6b6355]'
          }`}>
            {enabled ? <Bell className="w-4 h-4 animate-bounce" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-serif font-extrabold text-[13px] text-[#e8e0d0] tracking-tight">Rappels de Lecture</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              {permissionStatus === 'granted' ? (
                <span className="text-[8px] font-mono font-bold text-[#c9a84c] uppercase flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Notifications actives
                </span>
              ) : permissionStatus === 'denied' ? (
                <span className="text-[8px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Bloquées par navigateur
                </span>
              ) : (
                <span className="text-[8px] font-mono text-[#6b6355] uppercase">Alertes visuelles en jeu</span>
              )}
            </div>
          </div>
        </div>

        {/* Premium Gold Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none border ${
            enabled ? 'bg-[#c9a84c] border-[#c9a84c]' : 'bg-[#1a1712] border-[#2e2a1e]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform shadow ${
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
          style={{ backgroundColor: enabled ? '#0d0b07' : '#6b6355' }}></div>
        </button>
      </div>

      <p className="text-[10px] text-[#6b6355] leading-relaxed">
        Configurez un rendez-vous spirituel pour maintenir votre rythme de lecture quotidienne de l'Ancien ou Nouveau Testament.
      </p>

      {/* Interactive Time Selector */}
      <div className="bg-[#1a1712] rounded-xl border border-[#2e2a1e] p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#c9a84c]" />
          <span className="text-[10px] font-mono text-[#6b6355] uppercase">Heure de rappel</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Hour Picker Dial */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => handleTimeChange('hour', 'inc')}
              className="text-[10px] text-[#6b6355] hover:text-[#c9a84c] cursor-pointer"
            >▲</button>
            <span className="font-mono font-bold text-xs bg-[#0d0b07] text-[#e8e0d0] border border-[#2e2a1e] rounded px-2 py-0.5 min-w-[28px] text-center">
              {String(hour).padStart(2, '0')}
            </span>
            <button 
              onClick={() => handleTimeChange('hour', 'dec')}
              className="text-[10px] text-[#6b6355] hover:text-[#c9a84c] cursor-pointer"
            >▼</button>
          </div>

          <span className="font-mono font-extrabold text-[#c9a84c] animate-pulse">:</span>

          {/* Minute Picker Dial */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => handleTimeChange('minute', 'inc')}
              className="text-[10px] text-[#6b6355] hover:text-[#c9a84c] cursor-pointer"
            >▲</button>
            <span className="font-mono font-bold text-xs bg-[#0d0b07] text-[#e8e0d0] border border-[#2e2a1e] rounded px-2 py-0.5 min-w-[28px] text-center">
              {String(min).padStart(2, '0')}
            </span>
            <button 
              onClick={() => handleTimeChange('minute', 'dec')}
              className="text-[10px] text-[#6b6355] hover:text-[#c9a84c] cursor-pointer"
            >▼</button>
          </div>
        </div>
      </div>

      {/* Lower Actions Section */}
      <div className="flex gap-2">
        <button
          onClick={handleTestNotification}
          className="flex-1 py-1.5 bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] rounded-lg text-[9px] font-mono tracking-wider font-bold uppercase transition duration-150 cursor-pointer"
        >
          {showTestSuccess ? "✓ TEST DISPATCHÉ !" : "TESTER LE RAPPEL"}
        </button>
      </div>

      {/* Simulated Display Modal inside the app workspace on trigger */}
      {simulatedNotification && (
        <div className="bg-[#1a1712] border border-[#c9a84c]/20 rounded-xl p-3 mt-1.5 animate-fade-slide-up relative">
          <div className="flex items-start gap-2">
            <Bell className="w-4.5 h-4.5 text-[#c9a84c] shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 text-left">
              <h5 className="font-serif font-bold text-xs text-[#c9a84c]">{simulatedNotification.title}</h5>
              <p className="text-[10px] text-[#e8e0d0] leading-relaxed mt-0.5">{simulatedNotification.body}</p>
            </div>
            <button 
              onClick={() => setSimulatedNotification(null)}
              className="text-[#6b6355] hover:text-[#e8e0d0] font-bold text-xs ml-1"
            >
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
