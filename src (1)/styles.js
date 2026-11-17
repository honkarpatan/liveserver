// styles.js

export const popupStyles = ``; 

export const pageStyles = `
  /* This is the root div returned by createBigScreenPage */
  .suger-content-root {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  nav {
    height: 2.5rem; 
    width: 100%; 
    background-color: var(--primary-color);
    position: sticky;
    top: 0;
    display: flex; 
    flex-direction: row; 
    justify-content: space-between; 
    align-items: center;
    border-radius: 0; 
    border: none; 
    padding: 0 0px;
    z-index: 10;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    overflow-x : auto ;
  }

  .sugerserver_TitleContainer {
    display: flex;
    align-items: center;
    font-size: 1.2em;
    font-weight: 400;
  }
  
  /* ✅ URL Input Field Styling */
  #url-input {
    display: none; /* Initially Hidden */
    background: transparent;
    color: var(--text-color); /* Acode text color */
    border: none;
    border-bottom: 2px solid var(--active-color); /* Only bottom border */
    outline: none;
    padding: 2px 5px;
    font-size: 14px;
    font-family: monospace;
    width: 180px; /* Base width */
    max-width: 40vw; /* Responsive limit */
    transition: all 0.3s ease;
  }

  .sugerserver_ToolsContainer {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 12px;
    margin-right: 6px;
  }
  
  .sugerserver_ToolsContainer p {
    font-weight: 500;
    cursor: pointer;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Icons hover effect */
  .sugerserver_ToolsContainer p:active {
     opacity: 0.6;
  }

  #sugerframe, .sugerframe {
    flex-grow: 1;
    border: none;
    height: 100vh;
    width: 100%;
    background: #fff; /* Ensure iframe has background */
  }
`;