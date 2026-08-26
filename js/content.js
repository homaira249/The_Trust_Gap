(function (root) {
  'use strict';
  const TG = (root.TrustGap = root.TrustGap || {});

  // All scenario text lives here. The app is fictional: do not add real services or real personal data.
  // correct = index of the option that matches the fictional policy.
  TG.content = {
    app: 'FitTrack',
    items: [
      {
        id: 'location',
        label: 'precise location',
        question: 'What does FitTrack do with your precise location?',
        options: [
          'It shows only the weather where you are.',
          'It records your routes and shares your location with advertising partners.',
          'It uses your location only while the app is open, then deletes it.',
        ],
        correct: 1,
        short: 'FitTrack records your running routes and also shares your location with advertising partners.',
        full: 'FitTrack stores your routes on its servers, so they stay available after a run. Your location is also shared with advertising partners to target ads. Location records are kept for two years. Turning off sharing in settings stops future sharing, but it does not delete data already shared.',
      },
      {
        id: 'contacts',
        label: 'contact list',
        question: 'What does FitTrack do with your contact list?',
        options: [
          'It reads the list once to match phone numbers, then discards it.',
          'It shares names and phone numbers with partner brands only.',
          'It uploads a copy to its servers to suggest friends, and keeps it for two years.',
        ],
        correct: 2,
        short: 'FitTrack uploads a copy of your contacts to suggest friends.',
        full: 'FitTrack uploads a copy of your contact list to its servers and uses it to suggest friends. The copy is kept for two years. It includes the names and phone numbers of people who have never installed the app.',
      },
      {
        id: 'health',
        label: 'heart rate and sleep data',
        question: 'What does FitTrack do with your heart rate and sleep data?',
        options: [
          'It builds workout reports and shares them with insurance partners for risk scoring.',
          'It stores them only on your phone and never uploads them.',
          'It uses them only to count your daily steps.',
        ],
        correct: 0,
        short: 'FitTrack uses your heart rate and sleep data to build workout reports.',
        full: 'FitTrack builds workout and sleep reports from your data. It also shares that data with insurance partners, who use it for risk scoring. Once a partner has received the data, FitTrack cannot recall it.',
      },
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TG;
})(typeof window !== 'undefined' ? window : globalThis);
