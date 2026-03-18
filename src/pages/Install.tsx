import { useEffect, useState } from "react";
import { Share, Plus, MoreVertical, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-foreground">Already Installed!</h1>
          <p className="text-muted-foreground">Livespot is on your home screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 text-center">
        <img src="/pwa-192.png" alt="Livespot" className="w-24 h-24 mx-auto rounded-[24px]" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Install Livespot</h1>
          <p className="text-muted-foreground text-sm">
            Add Livespot to your home screen for the best experience.
          </p>
        </div>

        {isIOS ? (
          <div className="bg-card rounded-2xl p-6 space-y-4 text-left border border-border">
            <p className="text-sm font-semibold text-foreground">On iPhone / iPad:</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Share className="w-5 h-5 text-primary shrink-0" />
                <span>Tap the <strong className="text-foreground">Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Plus className="w-5 h-5 text-primary shrink-0" />
                <span>Tap <strong className="text-foreground">Add to Home Screen</strong></span>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Install App
          </button>
        ) : (
          <div className="bg-card rounded-2xl p-6 space-y-4 text-left border border-border">
            <p className="text-sm font-semibold text-foreground">On Android:</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MoreVertical className="w-5 h-5 text-primary shrink-0" />
              <span>Tap the <strong className="text-foreground">menu (⋮)</strong> → <strong className="text-foreground">Install app</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
