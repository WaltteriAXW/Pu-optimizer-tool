/**
 * The user guide, slide by slide. The pictures are the guide's own slides, rendered from the
 * PDF into public/guide/. The text here is the same content, written out so a screen reader
 * gets the whole guide and not just a picture of it. Keep the two in step when the guide changes.
 */
export interface GuideSlide {
  title: string
  text: string
}

export const GUIDE_SLIDES: readonly GuideSlide[] = [
  {
    title: 'Your first calculation, in five minutes.',
    text: 'PU Injection Optimizer user guide. How to use the tool, read the results, record how parts came out, and tell us what you find. Written for testers. AXW Chemicals Ltd and Alchemy Associates Ltd.',
  },
  {
    title: 'Nothing to install. Open it in a browser.',
    text: 'Open the link: go to the tool’s web address in a modern browser. No account and no sign-in. Wait for the engine: the first load shows “Initializing Engine” for a few seconds. After that, the tool works offline. Everything stays on your device: calculations, history and settings are saved in your browser. Nothing is sent to a server. Clearing site data erases them.',
  },
  {
    title: 'Pick a material and enter the line.',
    text: 'Material: open the Material list. It shows the four catalogued systems: Genfoam HD12, general purpose, water-blown; Genfoam HD20, denser, water-blown; Ecomate Spray EC, fast spray foam, zero-GWP agent; Ecofoam XHD RC, rigid, extra-high-density. Not in the list? Choose Custom Material and enter viscosity, density, flow index and activation energy. Line and conditions, valid ranges: pipe length 50 to 10,000 mm; pipe diameter 1 to 200 mm; material temperature 5 to 50 °C set point; flow rate 0.1 to 200 L/min. Longer lines and smaller diameters raise pressure drop. Higher temperatures lower viscosity.',
  },
  {
    title: 'Choose your machine type.',
    text: 'Low pressure operates at 8 to 20 bar. Choose this for LP metering machines. High pressure operates at 100 to 200 bar. The mix head needs at least 100 bar to mix, so the pressure reading won’t drop below that. The result tells you whether the machine can hold the required pressure. If it can’t, change the line or the flow rate and run again.',
  },
  {
    title: 'Add the conditions you want to model.',
    text: 'Optional. Leave this section closed and the calculation runs on the basic inputs only. Ambient and idle time: enter the air temperature and how long material sat in the hose since the last shot. Useful for single shots or stop-start work. Hose construction: add the hose material, wall thickness and any lagging. Only applies when you have entered an ambient temperature. Mould and part: enter mould temperature and part thickness for a cure and exotherm prediction. Only for catalogued materials with reaction data.',
  },
  {
    title: 'Run the simulation, then read the top card first.',
    text: 'Press Run Simulation. The top card has two numbers side by side. They mean different things. Machine output in kg/min is the setting: this is the dial you turn. Pump speed sets the flow, so this number moves the process. The card shows it against the machine’s own output range. Injection pressure in bar is the reading: this is what to expect at the machine. Turning the pressure up does not push more material through the line, and it won’t make the flow turbulent.',
  },
  {
    title: 'What the main cards tell you.',
    text: 'Laminar flow margin shows how far the line is from turbulent flow, and which input to change. If the margin is tight, increase diameter or reduce flow. The KPI row shows pressure drop, flow regime with Reynolds number, shear rate and viscosity. Use it as a quick check before you dig into detail. Pressure analysis shows the pressure profile along the line, fitting losses included. Find where most of the pressure is lost. Blowing agent shows whether it stays in solution, is close to boiling, or is at flash-off risk. Flash-off risk means change temperature or pressure.',
  },
  {
    title: 'Where the limits are, and how the part will cure.',
    text: 'Operating window shows how far each setting can move before the line needs more pressure than the machine allows. It gives the highest flow, lowest temperature and narrowest line. Mix-head temperature shows the set point, the ambient, and the temperature the material actually reaches. Appears only if you entered an ambient temperature. Cure and exotherm shows cream, gel and tack-free times, peak core temperature and scorch risk. Appears only with a part thickness and a catalogued material.',
  },
  {
    title: 'Pressure units, history, and the shot dataset.',
    text: 'Pressure units: the bar and psi toggle changes what you see on screen. It doesn’t change results. The PDF follows your choice. JSON, CSV and the text report always show bar. History: every calculation is saved to History, top right. Open a run to see its inputs and results again. Shot dataset: the sidebar in History can export all saved runs, import a file from another machine, or clear everything in this browser.',
  },
  {
    title: 'The one thing the physics can’t know.',
    text: 'Record how the part came out. This is how the tool learns where its predictions and real parts disagree. 1. Run the calculation: it saves to History automatically. 2. Open the saved run: choose it from the History list. 3. Choose the outcome: use “How did the part come out?”: good, voids, short-shot, scorch or surface defect. The tool won’t train or show a confidence figure until there are enough labelled shots. It never makes up data.',
  },
  {
    title: 'Four formats, one for each job.',
    text: 'JSON: full detail, for other tools or data exchange. CSV: spreadsheets, flat key and value pairs. Report (text): a quick, readable summary to paste into an email. PDF: print for the machine. Includes the pressure chart and operator and QA sign-off lines. The PDF prints light and follows your pressure unit. It says which unit it uses on the first page.',
  },
  {
    title: 'When the result isn’t what you need.',
    text: 'A different pressure: change pipe diameter or flow rate, then run again. Larger diameter or lower flow both lower the pressure. Lower material temperature: lower the set point, use a larger diameter, or reduce flow. All reduce shear heating. Smooth flow: increase the diameter or reduce the flow. The laminar flow margin shows the minimum that keeps it laminar. A material not in the list: choose Custom Material and enter its properties.',
  },
  {
    title: 'What the tool is still proving.',
    text: 'Not yet checked on a real machine: the hose model, the operating window and measured flow curves for custom materials are built, but not yet compared with shots on a real machine. Treat them as estimates, and tell us what you see. Estimates are marked: where a data sheet has no heat of reaction, the cure figures use a typical value and say so on the result. Where a property isn’t on the data sheet, the tool says “not specified.”',
  },
  {
    title: 'Tell us what you find.',
    text: 'For each test run, send us: the material and machine type used; the inputs, or the JSON export; what the part did on the machine; anything that looked wrong, even small things. Email info@axw.fi. Include a screenshot if you can.',
  },
]

/** Where slide n (1-based) is served from, under the app's base path. */
export function guideSlideSrc(n: number): string {
  return `${import.meta.env.BASE_URL}guide/slide-${String(n).padStart(2, '0')}.webp`
}
