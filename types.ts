
export interface BirthdayState {
  recipientName: string;
  isMusicPlaying: boolean;
  isGiftOpened: boolean;
  generatedWish: string;
  isLoadingWish: boolean;
  volume: number;
  memories: string[];
  customAudioUrl: string | null;
}

export interface GalleryItem {
  id: string;
  url: string;
  alt: string;
}
