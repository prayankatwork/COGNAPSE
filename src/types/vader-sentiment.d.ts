declare module 'vader-sentiment' {
  interface SentimentScores {
    compound: number;
    pos: number;
    neu: number;
    neg: number;
  }

  interface VaderModule {
    SentimentIntensityAnalyzer: {
      polarity_scores(text: string): SentimentScores;
    };
  }

  const vader: VaderModule;
  export default vader;
}
