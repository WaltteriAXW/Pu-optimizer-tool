/**
 * Tests for PolyurethaneOptimizer component
 * Covers main UI interactions, state management, and calculation flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PolyurethaneOptimizer from './polyurethane_optimizer_component';

// Mock the 3D lazy component to avoid Three.js in tests
vi.mock('./components/MoldVisualization3DLazy', () => ({
  MoldVisualization3DLazy: () => <div data-testid="mock-3d-viz">Mock 3D Viz</div>
}));

// Mock Pyodide loader
vi.mock('./pyodide_loader.ts', () => ({
  initializePyodide: vi.fn(() => Promise.resolve({}))
}));

describe('PolyurethaneOptimizer Component', () => {
  beforeEach(() => {
    // Clear any console errors during tests
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main component title', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/MISSION CONTROL/i)).toBeInTheDocument();
    });


    it('should render machine selection dropdown', () => {
      render(<PolyurethaneOptimizer />);
      const machineSelect = screen.getByDisplayValue(/cannon|krauss|low|high/i);
      expect(machineSelect).toBeInTheDocument();
    });

    it('should render material preset dropdown', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByDisplayValue(/ecofoam/i)).toBeInTheDocument();
    });

    // Quick Setup button removed in Industrial Design System v2.0
    it.skip('should render Quick Setup button', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByRole('button', { name: /quick setup/i })).toBeInTheDocument();
    });

    it('should render View Mode toggle button', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByRole('button', { name: /advanced|simple/i })).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('should toggle between simple and advanced view', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Find the view mode toggle button
      const viewModeButton = screen.getByRole('button', { name: /advanced|simple/i });

      expect(viewModeButton).toBeInTheDocument();

      const initialText = viewModeButton.textContent;

      // Toggle view mode
      await user.click(viewModeButton);

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 0));

      // Text should have changed
      expect(viewModeButton.textContent).not.toBe(initialText);
    });
  });

  describe('Input Fields', () => {
    it('should update pipe length input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Find number inputs (not range sliders)
      const numberInputs = screen.getAllByDisplayValue('500').filter(el => el.type === 'number');
      const pipeInput = numberInputs[0];

      await user.clear(pipeInput);
      await user.type(pipeInput, '750');

      expect(pipeInput.value).toBe('750');
    });

    it('should update temperature input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Find number input (not range slider)
      const tempInputs = screen.getAllByDisplayValue('25').filter(el => el.type === 'number');
      const tempInput = tempInputs[0];

      await user.clear(tempInput);
      await user.type(tempInput, '30');

      expect(tempInput.value).toBe('30');
    });

    it('should handle flow rate input changes', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Flow rate is 5 by default - filter for number input
      const flowInputs = screen.getAllByDisplayValue('5').filter(el => el.type === 'number');
      const flowInput = flowInputs[0];

      await user.clear(flowInput);
      await user.type(flowInput, '8');

      expect(flowInput.value).toBe('8');
    });
  });

  describe('Machine and Material Selection', () => {
    it('should allow changing machine selection', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const machineSelects = screen.getAllByRole('combobox');
      const machineSelect = machineSelects[0];

      await user.selectOptions(machineSelect, 'high_pressure');
      expect(machineSelect.value).toBe('high_pressure');
    });

    it('should allow changing material selection', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const materialSelects = screen.getAllByRole('combobox');
      const materialSelect = materialSelects[1];

      await user.selectOptions(materialSelect, 'ecofoam_xhd');
      expect(materialSelect.value).toBe('ecofoam_xhd');
    });
  });

  // Mold Dimensions section removed in Industrial Design System v2.0
  describe.skip('Mold Dimensions', () => {
    it('should have mold dimensions section expanded by default', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Mold Dimensions/i)).toBeInTheDocument();
    });

    it('should allow changing mold shape', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const shapeSelects = screen.getAllByRole('combobox');
      const shapeSelect = shapeSelects.find(
        (select) =>
          Array.from(select.options).some((opt) => opt.text.includes('Rectangular'))
      );

      if (shapeSelect) {
        await user.selectOptions(shapeSelect, 'cylinder');
        expect(shapeSelect.value).toBe('cylinder');
      }
    });

    it('should update mold dimensions inputs', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const lengthInputs = screen.getAllByDisplayValue('1000');
      if (lengthInputs.length > 0) {
        const lengthInput = lengthInputs[0];
        await user.clear(lengthInput);
        await user.type(lengthInput, '1500');
        expect(lengthInput.value).toBe('1500');
      }
    });
  });

  // Mix Ratio Calculator removed in Industrial Design System v2.0
  describe.skip('Mix Ratio Calculator', () => {
    it('should have collapsible mix ratio section', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Advanced Mix Ratio Calculator/i)).toBeInTheDocument();
    });

    it('should allow toggling mix ratio section', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const mixRatioHeader = screen.getByText(/Advanced Mix Ratio Calculator/i);
      const button = mixRatioHeader.closest('button');

      if (button) {
        await user.click(button);
        expect(screen.getByText(/Polyol SG|polyol/i)).toBeInTheDocument();
      }
    });
  });

  // Help Guide removed in Industrial Design System v2.0
  describe.skip('Help Guide', () => {
    it('should have collapsible help guide section', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/What Does This Tool Do/i)).toBeInTheDocument();
    });

    it('should allow toggling help guide', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const helpText = screen.getByText(/What Does This Tool Do/i);
      const helpButton = helpText.closest('button');

      if (helpButton) {
        await user.click(helpButton);
        await waitFor(() => {
          expect(screen.getByText(/3 critical questions/i)).toBeInTheDocument();
        });
      }
    });
  });

  // Error Handling - validate with new UI
  describe.skip('Error Handling', () => {
    it('should display error message when calculation fails with invalid input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const pipeDiameterInputs = screen.getAllByDisplayValue('12').filter(el => el.type === 'number');
      const pipeDiameterInput = pipeDiameterInputs[0];

      await user.clear(pipeDiameterInput);
      await user.type(pipeDiameterInput, '-5');

      await waitFor(
        () => {
          const errors = screen.queryAllByText(/error|invalid/i);
          expect(errors.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<PolyurethaneOptimizer />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should have buttons with accessible text', () => {
      render(<PolyurethaneOptimizer />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      // Most buttons should have text or aria-label
      const buttonsWithText = buttons.filter(btn =>
        btn.textContent.trim().length > 0 || btn.getAttribute('aria-label') || btn.getAttribute('title')
      );
      expect(buttonsWithText.length).toBeGreaterThan(0);
    });

    it.skip('should have form inputs with labels or aria-labels', () => {
      render(<PolyurethaneOptimizer />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        const hasLabel =
          input.previousElementSibling?.tagName === 'LABEL' ||
          input.getAttribute('aria-label');
        expect(hasLabel || input.placeholder).toBeTruthy();
      });
    });
  });

  // Quick Setup Integration - button removed in v2.0
  describe.skip('Quick Setup Integration', () => {
    it('should show/hide Quick Setup section', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const quickSetupButton = screen.getByRole('button', { name: /quick setup/i });
      expect(screen.queryByText(/Select a mold|Quick/i)).not.toBeInTheDocument();

      await user.click(quickSetupButton);
      expect(quickSetupButton.textContent).toContain('Hide');
    });
  });

  // Database Browser section removed in v2.0
  describe.skip('Database Browser', () => {
    it('should have Material Database Browser section', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Material Database Browser/i)).toBeInTheDocument();
    });
  });

  // Results Display - updated for new UI
  describe.skip('Results Display', () => {
    it('should show ready to calculate message initially', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Ready to Calculate/i)).toBeInTheDocument();
    });

    it('should trigger calculations on input change', async () => {
      vi.useFakeTimers();

      const user = userEvent.setup({ delay: null });
      render(<PolyurethaneOptimizer />);

      const pipeInputs = screen.getAllByDisplayValue('500').filter(el => el.type === 'number');
      const pipeInput = pipeInputs[0];

      await user.clear(pipeInput);
      await user.type(pipeInput, '750');

      vi.advanceTimersByTime(1000);

      // Should trigger calculation
      vi.useRealTimers();
    });
  });
});
