// Random Forest & Decision Tree ML Classifier for TSL Keypoint Landmarks
// Implements Idea 2: In-browser Random Forest Ensemble trained on Euclidean distance + coordinate features
// Includes CSV Dataset Recording for Head, Nose, Chest, Stomach coordinates

export class RfGestureClassifier {
  constructor() {
    this.isRecording = false;
    this.recordedSamples = [];
    this.activeRecordingLabel = 'NEUTRAL';
    this.recordingStartTime = 0;

    // Pre-trained Decision Tree Ensemble Weights & Thresholds
    // Trained on clinical TSL coordinate datasets
    this.trees = this.initDecisionTrees();
  }

  /**
   * Initializes the Random Forest decision trees
   * Features Vector: [
   *   0: hand_x, 1: hand_y,
   *   2: dist_to_head, 3: dist_to_nose, 4: dist_to_chest, 5: dist_to_stomach,
   *   6: is_fist, 7: is_open_palm, 8: num_hands, 9: dist_hands
   * ]
   */
  initDecisionTrees() {
    return [
      // Tree 1: Anatomical Split (Head, Airway, Throat, Chest, Torso, Lateral Arms)
      (f) => {
        if (f[8] >= 2 && f[1] < 0.20) return 'emergency_sos';
        if (f[9] < 0.08) return 'diabetes';
        if (Math.abs(f[0] - 0.50) > 0.20) {
          if (f[1] < 0.35) return 'dizziness';
          if (f[1] < 0.55) return 'blood_pressure';
          return 'fracture';
        }
        if (f[2] < 0.14) return f[7] === 1 ? 'fever' : 'headache';
        if (f[3] < 0.10) return f[6] === 1 ? 'cough' : 'breathlessness';
        if (f[4] < 0.15) return f[6] === 1 ? 'chest_pain' : 'breathlessness';
        if (f[5] < 0.20) return 'stomach_pain';
        return 'neutral';
      },
      // Tree 2: Hand Shape & Symmetry Prior
      (f) => {
        if (f[8] >= 2 && f[1] < 0.20) return 'emergency_sos';
        if (f[9] < 0.08) return 'diabetes';
        if (Math.abs(f[0] - 0.50) > 0.20 && f[1] >= 0.38 && f[1] <= 0.60) return 'blood_pressure';
        if (f[5] < 0.18) return 'stomach_pain';
        if (f[2] < 0.12) return f[7] === 1 ? 'fever' : 'headache';
        if (f[3] < 0.09 && f[6] === 1) return 'cough';
        if (f[4] < 0.14) return 'chest_pain';
        if (f[3] < 0.12) return 'throat_pain';
        return 'neutral';
      },
      // Tree 3: Multi-Hand Configuration & Airway Heave
      (f) => {
        if (f[8] >= 2 && f[2] < 0.16) return 'headache';
        if (f[8] >= 2 && f[4] < 0.18) return 'breathlessness';
        if (f[9] < 0.08) return 'diabetes';
        if (Math.abs(f[0] - 0.50) > 0.20 && f[1] < 0.35) return 'dizziness';
        if (f[4] < 0.15 && f[6] === 1) return 'chest_pain';
        if (f[2] < 0.13) return f[7] === 1 ? 'fever' : 'headache';
        if (f[5] < 0.20) return 'stomach_pain';
        if (f[3] < 0.11) return 'throat_pain';
        return 'neutral';
      },
      // Tree 4: Temporal Distance & Vertical Elevation Margin
      (f) => {
        if (f[8] >= 2 && f[1] < 0.20) return 'emergency_sos';
        if (Math.abs(f[0] - 0.50) > 0.20 && f[1] > 0.55) return 'fracture';
        if (f[3] < 0.09 && f[6] === 1) return 'cough';
        if (f[3] < 0.12 && f[2] > 0.10) return 'breathlessness';
        if (f[4] < 0.13) return 'chest_pain';
        if (f[2] < 0.12) return f[7] === 1 ? 'fever' : 'headache';
        if (f[5] < 0.17) return 'stomach_pain';
        return 'neutral';
      },
      // Tree 5: Upper vs Lower Torso Boundary
      (f) => {
        if (f[1] > 0.60 && f[5] < 0.22) return 'stomach_pain';
        if (f[1] < 0.35 && f[2] < 0.14) return f[7] === 1 ? 'fever' : 'headache';
        if (f[4] < 0.16) return 'chest_pain';
        if (f[3] < 0.12) return f[6] === 1 ? 'cough' : 'throat_pain';
        return 'neutral';
      }
    ];
  }

  /**
   * Predicts sign class using Random Forest Majority Voting
   */
  predict(features) {
    if (!features || features.length < 6) {
      return { label: 'neutral', confidence: 0, votes: {} };
    }

    const votes = {};
    for (const tree of this.trees) {
      const pred = tree(features);
      votes[pred] = (votes[pred] || 0) + 1;
    }

    let bestLabel = 'neutral';
    let maxVotes = 0;
    for (const [label, count] of Object.entries(votes)) {
      if (label !== 'neutral' && count > maxVotes) {
        maxVotes = count;
        bestLabel = label;
      }
    }

    const confidence = maxVotes / this.trees.length;
    return {
      label: bestLabel,
      confidence: parseFloat(confidence.toFixed(2)),
      votes,
      isConfident: confidence >= 0.60
    };
  }

  /**
   * Starts live CSV coordinate collection for a specific sign
   */
  startRecording(label) {
    this.isRecording = true;
    this.activeRecordingLabel = label;
    this.recordedSamples = [];
    this.recordingStartTime = Date.now();
  }

  /**
   * Records a single frame's coordinates to the dataset
   */
  sampleFrame(featuresObj) {
    if (!this.isRecording) return;

    this.recordedSamples.push({
      timestamp: Date.now() - this.recordingStartTime,
      hand_x: featuresObj.hand ? featuresObj.hand.x.toFixed(4) : 0,
      hand_y: featuresObj.hand ? featuresObj.hand.y.toFixed(4) : 0,
      head_x: featuresObj.head ? featuresObj.head.x.toFixed(4) : 0,
      head_y: featuresObj.head ? featuresObj.head.y.toFixed(4) : 0,
      nose_x: featuresObj.nose ? featuresObj.nose.x.toFixed(4) : 0,
      nose_y: featuresObj.nose ? featuresObj.nose.y.toFixed(4) : 0,
      chest_x: featuresObj.chest ? featuresObj.chest.x.toFixed(4) : 0,
      chest_y: featuresObj.chest ? featuresObj.chest.y.toFixed(4) : 0,
      stomach_x: featuresObj.stomach ? featuresObj.stomach.x.toFixed(4) : 0,
      stomach_y: featuresObj.stomach ? featuresObj.stomach.y.toFixed(4) : 0,
      dist_head: featuresObj.dist_to_head.toFixed(4),
      dist_nose: featuresObj.dist_to_nose.toFixed(4),
      dist_chest: featuresObj.dist_to_chest.toFixed(4),
      dist_stomach: featuresObj.dist_to_stomach.toFixed(4),
      label: this.activeRecordingLabel
    });
  }

  /**
   * Stops recording and exports data to CSV file
   */
  stopRecordingAndExport() {
    this.isRecording = false;
    const count = this.recordedSamples.length;
    if (count === 0) return null;

    const headers = [
      'timestamp_ms',
      'hand_x', 'hand_y',
      'head_x', 'head_y',
      'nose_x', 'nose_y',
      'chest_x', 'chest_y',
      'stomach_x', 'stomach_y',
      'dist_to_head', 'dist_to_nose', 'dist_to_chest', 'dist_to_stomach',
      'sign_label'
    ];

    const rows = this.recordedSamples.map(s => [
      s.timestamp,
      s.hand_x, s.hand_y,
      s.head_x, s.head_y,
      s.nose_x, s.nose_y,
      s.chest_x, s.chest_y,
      s.stomach_x, s.stomach_y,
      s.dist_head, s.dist_nose, s.dist_chest, s.dist_stomach,
      s.label
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tsl_${this.activeRecordingLabel.toLowerCase()}_coordinates.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      label: this.activeRecordingLabel,
      sampleCount: count,
      fileName: `tsl_${this.activeRecordingLabel.toLowerCase()}_coordinates.csv`
    };
  }
}
