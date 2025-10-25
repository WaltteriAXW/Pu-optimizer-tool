#!/usr/bin/env python3
"""
PINN CLI - Command-line interface for Claude Code
Provides prediction and self-training capabilities
"""

import argparse
import json
import sys
from pathlib import Path
from self_training_pinn import SelfTrainingPINN


def predict_command(args):
    """Make a prediction"""
    pinn = SelfTrainingPINN(model_path=args.model)
    
    result = pinn.predict(
        pipe_length=args.length,
        pipe_diameter=args.diameter,
        temperature=args.temperature,
        flow_rate=args.flow,
        viscosity=args.viscosity,
        density=args.density
    )
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print("\n" + "="*60)
        print("PINN PREDICTION RESULTS")
        print("="*60)
        print(f"\nPredictions:")
        print(f"  Pressure:  {result['predictions']['required_pressure_bar']:.2f} bar")
        print(f"  Reynolds:  {result['predictions']['reynolds_number']:.1f}")
        print(f"  Velocity:  {result['predictions']['velocity_ms']:.3f} m/s")
        print(f"\nConfidence: {result['confidence']}%")
        print(f"Training Count: {result['training_count']}")
        
        print(f"\nPhysics Check:")
        print(f"  Physics Pressure: {result['physics_check']['physics_pressure_bar']:.2f} bar")
        print(f"  Deviation: {result['physics_check']['deviation_pct']:.1f}%")
        print(f"  Flow Regime: {result['physics_check']['flow_regime']}")
        print(f"  Consistent: {'✓' if result['physics_check']['physics_consistent'] else '✗'}")
        
        print(f"\nRecommendations:")
        for rec in result['recommendations']:
            print(f"  {rec}")


def feedback_command(args):
    """Provide feedback to improve the model"""
    pinn = SelfTrainingPINN(model_path=args.model)
    
    # First, make a prediction to show before/after
    before = pinn.predict(
        pipe_length=args.length,
        pipe_diameter=args.diameter,
        temperature=args.temperature,
        flow_rate=args.flow,
        viscosity=args.viscosity,
        density=args.density
    )
    
    print("\n" + "="*60)
    print("BEFORE FEEDBACK")
    print("="*60)
    print(f"Predicted Pressure: {before['predictions']['required_pressure_bar']:.2f} bar")
    print(f"Actual Pressure: {args.actual_pressure:.2f} bar")
    
    error_before = abs(before['predictions']['required_pressure_bar'] - args.actual_pressure)
    print(f"Error: {error_before:.2f} bar ({error_before/args.actual_pressure*100:.1f}%)")
    
    # Provide feedback
    stats = pinn.train_from_feedback(
        pipe_length=args.length,
        pipe_diameter=args.diameter,
        temperature=args.temperature,
        flow_rate=args.flow,
        viscosity=args.viscosity,
        density=args.density,
        actual_pressure=args.actual_pressure,
        actual_reynolds=args.actual_reynolds,
        actual_velocity=args.actual_velocity
    )
    
    print("\n" + "="*60)
    print("FEEDBACK PROCESSED")
    print("="*60)
    print(f"Training Count: {stats['training_count']}")
    print(f"Pressure Error: {stats.get('pressure_error', 'N/A'):.2f}%")
    
    if stats.get('average_pressure_error'):
        print(f"Average Error (recent): {stats['average_pressure_error']:.2f}%")
    
    # Make another prediction to show improvement
    after = pinn.predict(
        pipe_length=args.length,
        pipe_diameter=args.diameter,
        temperature=args.temperature,
        flow_rate=args.flow,
        viscosity=args.viscosity,
        density=args.density
    )
    
    print("\n" + "="*60)
    print("AFTER FEEDBACK")
    print("="*60)
    print(f"Predicted Pressure: {after['predictions']['required_pressure_bar']:.2f} bar")
    print(f"Actual Pressure: {args.actual_pressure:.2f} bar")
    
    error_after = abs(after['predictions']['required_pressure_bar'] - args.actual_pressure)
    print(f"Error: {error_after:.2f} bar ({error_after/args.actual_pressure*100:.1f}%)")
    
    improvement = error_before - error_after
    if improvement > 0:
        print(f"\n✓ Improved by {improvement:.2f} bar!")
    else:
        print(f"\n→ Change: {improvement:.2f} bar (model learning...)")
    
    print(f"\nModel saved to: {args.model}")


def stats_command(args):
    """Show model statistics"""
    pinn = SelfTrainingPINN(model_path=args.model)
    stats = pinn.get_statistics()
    
    print("\n" + "="*60)
    print("MODEL STATISTICS")
    print("="*60)
    
    print(f"\nModel Version: {stats.get('model_version', 'unknown')}")
    print(f"Created: {stats.get('created', 'unknown')}")
    print(f"Last Updated: {stats.get('last_updated', 'never')}")
    print(f"\nTraining Count: {stats['training_count']}")
    print(f"Learning Rate: {stats['learning_rate']}")
    print(f"Physics Weight: {stats['physics_weight']}")
    
    print(f"\nAverage Errors (recent feedback):")
    for key, value in stats.items():
        if 'avg_error' in key:
            target = key.replace('_avg_error_pct', '')
            print(f"  {target.capitalize()}: {value:.2f}%")
    
    if args.json:
        print("\n" + json.dumps(stats, indent=2))


def batch_command(args):
    """Process batch of predictions/feedback from JSON file"""
    with open(args.input, 'r') as f:
        batch_data = json.load(f)
    
    pinn = SelfTrainingPINN(model_path=args.model)
    results = []
    
    for i, item in enumerate(batch_data):
        print(f"\nProcessing item {i+1}/{len(batch_data)}...")
        
        if 'actual_pressure' in item:
            # This is feedback
            stats = pinn.train_from_feedback(
                pipe_length=item['pipe_length'],
                pipe_diameter=item['pipe_diameter'],
                temperature=item['temperature'],
                flow_rate=item['flow_rate'],
                viscosity=item['viscosity'],
                density=item['density'],
                actual_pressure=item['actual_pressure'],
                actual_reynolds=item.get('actual_reynolds'),
                actual_velocity=item.get('actual_velocity')
            )
            results.append({'type': 'feedback', 'stats': stats})
        else:
            # This is a prediction
            result = pinn.predict(
                pipe_length=item['pipe_length'],
                pipe_diameter=item['pipe_diameter'],
                temperature=item['temperature'],
                flow_rate=item['flow_rate'],
                viscosity=item['viscosity'],
                density=item['density']
            )
            results.append({'type': 'prediction', 'result': result})
    
    # Save results if output specified
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Results saved to: {args.output}")
    
    print(f"\n✓ Processed {len(batch_data)} items")
    print(f"✓ Model saved to: {args.model}")


def reset_command(args):
    """Reset model to initial state"""
    if Path(args.model).exists():
        if args.force:
            Path(args.model).unlink()
            print(f"✓ Model deleted: {args.model}")
            print("A new model will be created on next use.")
        else:
            print(f"⚠️  Model exists: {args.model}")
            print("Use --force to delete and reset")
    else:
        print(f"No model found at: {args.model}")


def export_command(args):
    """Export training data"""
    pinn = SelfTrainingPINN(model_path=args.model)
    output_path = pinn.export_training_data(args.output)
    print(f"✓ Training data exported to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='PINN CLI - Self-training neural network for polyurethane injection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Make a prediction
  python pinn_cli.py predict --length 500 --diameter 12 --temperature 25 --flow 10

  # Provide feedback to improve model
  python pinn_cli.py feedback --length 500 --diameter 12 --temperature 25 --flow 10 --actual-pressure 1.25

  # Show model statistics
  python pinn_cli.py stats

  # Process batch from JSON file
  python pinn_cli.py batch --input data.json --output results.json

  # Export training data
  python pinn_cli.py export --output training_data.json
        """
    )
    
    parser.add_argument('--model', default='pinn_model.json', help='Path to model file')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Predict command
    predict_parser = subparsers.add_parser('predict', help='Make a prediction')
    predict_parser.add_argument('--length', type=float, required=True, help='Pipe length (mm)')
    predict_parser.add_argument('--diameter', type=float, required=True, help='Pipe diameter (mm)')
    predict_parser.add_argument('--temperature', type=float, required=True, help='Temperature (°C)')
    predict_parser.add_argument('--flow', type=float, required=True, help='Flow rate (L/min)')
    predict_parser.add_argument('--viscosity', type=float, default=350, help='Viscosity (mPa·s)')
    predict_parser.add_argument('--density', type=float, default=1120, help='Density (kg/m³)')
    predict_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    # Feedback command
    feedback_parser = subparsers.add_parser('feedback', help='Provide feedback to train model')
    feedback_parser.add_argument('--length', type=float, required=True, help='Pipe length (mm)')
    feedback_parser.add_argument('--diameter', type=float, required=True, help='Pipe diameter (mm)')
    feedback_parser.add_argument('--temperature', type=float, required=True, help='Temperature (°C)')
    feedback_parser.add_argument('--flow', type=float, required=True, help='Flow rate (L/min)')
    feedback_parser.add_argument('--viscosity', type=float, default=350, help='Viscosity (mPa·s)')
    feedback_parser.add_argument('--density', type=float, default=1120, help='Density (kg/m³)')
    feedback_parser.add_argument('--actual-pressure', type=float, required=True, help='Measured pressure (bar)')
    feedback_parser.add_argument('--actual-reynolds', type=float, help='Measured Reynolds number')
    feedback_parser.add_argument('--actual-velocity', type=float, help='Measured velocity (m/s)')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show model statistics')
    stats_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    # Batch command
    batch_parser = subparsers.add_parser('batch', help='Process batch from JSON file')
    batch_parser.add_argument('--input', required=True, help='Input JSON file')
    batch_parser.add_argument('--output', help='Output JSON file')
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset model to initial state')
    reset_parser.add_argument('--force', action='store_true', help='Force deletion')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export training data')
    export_parser.add_argument('--output', default='training_data.json', help='Output file')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    try:
        if args.command == 'predict':
            predict_command(args)
        elif args.command == 'feedback':
            feedback_command(args)
        elif args.command == 'stats':
            stats_command(args)
        elif args.command == 'batch':
            batch_command(args)
        elif args.command == 'reset':
            reset_command(args)
        elif args.command == 'export':
            export_command(args)
        
        return 0
        
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
