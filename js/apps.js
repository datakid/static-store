(() => {
  const floe = {
    name: 'Floe', hue: 45, icon: 'polars',
    about: 'Local-first data prep for CSV, Excel, JSON and Parquet.',
    more: 'Local-first data preparation and transformation for CSV, Excel, JSON, Parquet and Arrow files, with filtering, joins, profiling and export, built with Tauri 2, Rust and JavaScript, with an optional native Rust/Polars processing engine.',
    stack: 'Tauri 2 + Rust + JS', engine: 'JS / Polars'
  };
  window.STORE = {
    name: 'Shelf',
    owners: ['datakid', 'nickburser122'],
    makers: [
      { user: 'datakid', tag: 'Main' },
      { user: 'nickburser122', tag: 'Alt' }
    ],
    repos: ['nickburser122/tacit'],
    hide: ['datakid/static-store'],
    tune: {
      'datakid/floe': floe,
      'datakid/polars-desktop-demo': floe,
      'datakid/duckbench-2': {
        name: 'DuckBench', hue: 22, icon: 'duckbars',
        about: 'Visual data prep and SQL analytics on DuckDB-WASM.',
        more: 'Local-first visual data preparation and SQL analytics for CSV, Excel, JSON and Parquet files, with transformations, joins and large-file processing, built with Tauri 2, Rust, JavaScript and bundled DuckDB-WASM.',
        stack: 'Tauri 2 + Rust + JS', engine: 'DuckDB-WASM'
      },
      'datakid/duckbench-tauri': {
        name: 'DuckBench Tauri', hue: 22, icon: 'duckgrid',
        about: 'Native data-cleaning workbench on a DuckDB engine.',
        more: 'Native desktop data-cleaning workbench with visual transformations, SQL execution, large-file processing and Excel import/export, built with Tauri 2, Rust and a separate native DuckDB engine process.',
        stack: 'Tauri 2 + Rust', engine: 'Native DuckDB'
      },
      'datakid/contact-flow': {
        hue: 35, icon: 'images/contact-flow.jpg', zoom: 1.25,
        about: 'Offline contacts: import, dedupe, fuzzy search, backup.',
        more: 'Offline contact management with batch import/export, duplicate detection, multilingual fuzzy search, number tagging and contact backup, built with Flutter and Dart, with Lite and Full editions.',
        stack: 'Flutter + Dart', engine: 'Android APIs'
      },
      'nickburser122/tacit': {
        hue: 85, icon: 'tacit',
        about: 'Offline keyboard launcher with fuzzy search and snippets.',
        more: 'Offline, keyboard-driven Android launcher with fuzzy app search, contact and system-settings lookup, file search, clipboard history, snippets and quick actions, built natively with Kotlin and Android platform APIs.',
        stack: 'Kotlin + Android SDK', engine: 'Android APIs'
      },
      'datakid/ps-tools-': {
        name: 'PS Tools', hue: 255, icon: 'pstools',
        about: 'Explorer right-click toolkit, 399 PowerShell commands.',
        more: 'Windows Explorer productivity and administration toolkit with searchable right-click actions, PowerShell and CMD execution, script automation, command history and a searchable library of 399 PowerShell commands, built with C# and WinForms on .NET Framework.',
        stack: 'C# + WinForms', engine: '.NET / PowerShell'
      }
    }
  };
})();
