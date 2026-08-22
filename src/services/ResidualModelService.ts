import type { PyodideManager } from './CalculationService'
import { getRecords, type ShotRecord } from './ShotRecordStore'

/**
 * Training a model on recorded shots, from the browser.
 *
 * The point of this service is as much what it refuses to do as what it does. It asks the
 * Python side whether there is enough data before loading scikit-learn, so the ordinary
 * case — nowhere near enough labelled shots — costs no download and produces a statement of
 * the shortfall rather than a number.
 */

export interface ModelReadiness {
  ready: boolean
  reasons: string[]
  labelled: number
  unlabelled: number
  incomplete: number
  good: number
  bad: number
  required: number
}

export interface TrainingResult {
  trained: true
  samples: number
  held_out: number
  accuracy: number
  confusion: number[][]
  feature_importance: Record<string, number>
  caveat: string
}

export class ResidualModelService {
  private packagesLoaded = false

  constructor(private readonly bridge: PyodideManager) {}

  /**
   * Whether a model could be trained at all.
   *
   * Deliberately answered without scikit-learn: pulling several megabytes down to be told
   * there are four labelled shots would be a poor trade.
   */
  async checkReadiness(records: ShotRecord[] = getRecords()): Promise<ModelReadiness> {
    return this.bridge.callPython<ModelReadiness>(
      'src.core.learning.residual_model.readiness',
      [records]
    )
  }

  /**
   * Fit a model on the recorded outcomes.
   *
   * Readiness is checked first so the packages are only fetched when they will be used. The
   * Python side raises independently of this check — the check being skipped is exactly how
   * a model fitted to nine samples ends up on a screen.
   */
  async train(records: ShotRecord[] = getRecords()): Promise<TrainingResult> {
    const readiness = await this.checkReadiness(records)
    if (!readiness.ready) {
      throw new Error(readiness.reasons.join('; '))
    }

    await this.ensurePackages()

    return this.bridge.callPython<TrainingResult>('src.core.learning.residual_model.train', [
      records,
    ])
  }

  /**
   * Fetch scikit-learn and its dependencies, once.
   *
   * These are absent from the boot path on purpose — the calculation engine is pure standard
   * library, and making every visitor download numpy to open a pressure calculator was the
   * cost this replaced.
   */
  private async ensurePackages(): Promise<void> {
    if (this.packagesLoaded) return
    if (!this.bridge.loadPackage) {
      throw new Error('This runtime cannot load scikit-learn, so no model can be trained.')
    }
    await this.bridge.loadPackage('scikit-learn')
    this.packagesLoaded = true
  }
}
