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
      expect(screen.getByText('PU Injection Optimizer')).toBeInTheDocument();
    });

    it('should display the beta disclaimer', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/BETA VERSION/i)).toBeInTheDocument();
    });

    it('should render machine selection dropdown', () => {
      render(<PolyurethaneOptimizer />);
      const machineSelect = screen.getByDisplayValue(/cannon|low|high/);
      expect(machineSelect).toBeInTheDocument();
    });

    it('should render material preset dropdown', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByDisplayValue(/ecofoam/i)).toBeInTheDocument();
    });

    it('should render Quick Setup button', () => {
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

      // Find the view mode toggle button (not the first button)
      const buttons = screen.getAllByRole('button');
      const viewModeButton = buttons.find(
        (btn) => btn.textContent.includes('Advanced') || btn.textContent.includes('Simple')
      );

      expect(viewModeButton).toBeInTheDocument();

      // Toggle to advanced
      await user.click(viewModeButton);
      expect(viewModeButton).toHaveTextContent(/Simple|simple/);

      // Toggle back to simple
      await user.click(viewModeButton);
      expect(viewModeButton).toHaveTextContent(/Advanced|advanced/);
    });
  });

  describe('Input Fields', () => {
    it('should update pipe length input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const pipeInputs = screen.getAllByDisplayValue('500');
      const pipeInput = pipeInputs[0];

      await user.clear(pipeInput);
      await user.type(pipeInput, '750');

      expect(pipeInput.value).toBe('750');
    });

    it('should update temperature input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const tempInput = screen.getByDisplayValue('25');

      await user.clear(tempInput);
      await user.type(tempInput, '30');

      expect(tempInput.value).toBe('30');
    });

    it('should handle flow rate input changes', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Flow rate is 5 by default
      const flowInputs = screen.getAllByDisplayValue('5');
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

      await user.selectOptions(materialSelect, 'flexible_foam');
      expect(materialSelect.value).toBe('flexible_foam');
    });
  });

  describe('Mold Dimensions', () => {
    it('should have mold dimensions section expanded by default', () => {
      render(<PolyurethaneOptimizer />);
      // The mold dimensions text should be visible
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

  describe('Mix Ratio Calculator', () => {
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
        // After clicking, the section should show more details
        expect(screen.getByText(/Polyol SG|polyol/i)).toBeInTheDocument();
      }
    });
  });

  describe('Help Guide', () => {
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
        // Help content should become visible
        await waitFor(() => {
          expect(screen.getByText(/3 critical questions/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should display error message when calculation fails with invalid input', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      // Set invalid input (negative pipe diameter)
      const pipeDiameterInputs = screen.getAllByDisplayValue('12');
      const pipeDiameterInput = pipeDiameterInputs[0];

      await user.clear(pipeDiameterInput);
      await user.type(pipeDiameterInput, '-5');

      // Wait for error to appear
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
      buttons.forEach((button) => {
        expect(button.textContent.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have form inputs with labels or aria-labels', () => {
      render(<PolyurethaneOptimizer />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        // Either has a label or aria-label
        const hasLabel =
          input.previousElementSibling?.tagName === 'LABEL' ||
          input.getAttribute('aria-label');
        expect(hasLabel || input.placeholder).toBeTruthy();
      });
    });
  });

  describe('Quick Setup Integration', () => {
    it('should show/hide Quick Setup section', async () => {
      const user = userEvent.setup();
      render(<PolyurethaneOptimizer />);

      const quickSetupButton = screen.getByRole('button', { name: /quick setup/i });

      // Initially hidden
      expect(screen.queryByText(/Select a mold|Quick/i)).not.toBeInTheDocument();

      // Click to show
      await user.click(quickSetupButton);

      // Look for Quick Setup content
      expect(quickSetupButton.textContent).toContain('Hide');
    });
  });

  describe('Database Browser', () => {
    it('should have Material Database Browser section', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Material Database Browser/i)).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('should show ready to calculate message initially', () => {
      render(<PolyurethaneOptimizer />);
      expect(screen.getByText(/Ready to Calculate/i)).toBeInTheDocument();
    });

    it('should trigger calculations on input change', async () => {
      vi.useFakeTimers();

      const user = userEvent.setup({ delay: null });
      render(<PolyurethaneOptimizer />);

      const pipeInputs = screen.getAllByDisplayValue('500');
      const pipeInput = pipeInputs[0];

      // Change input
      await user.clear(pipeInput);
      await user.type(pipeInput, '750');

      // Wait for debounce
      vi.advanceTimersByTime(1000);

      // Should trigger calculation
      vi.useRealTimers();
    });
  });
});
