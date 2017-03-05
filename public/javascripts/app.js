'use strict';

class FilesArea extends React.Component {
  render() {
    return <textarea value={this.props.filesRaw} onChange={this.props.changeFiles}/>;
  }
}

class Licenses extends React.Component {

  renderRows() {
    return this.props.data.map((file, idx) => {
      return (
        <div key={idx} className='row'>
          <div className='col-md-6'>
            {file.path}
          </div>
          <div className='col-md-6'>
            <a href={file.license.link}>{file.license.title || 'N/A'}</a>
          </div>
        </div>
      );
    });
  }

  render() {
    if (!this.props.data) {
      return null;
    }

    let rows = this.renderRows();

    return (
      <div className='licenses-container container-fluid'>
        <div className='row'>
          <div className='col-md-6'>
            Java filename
          </div>
          <div className='col-md-6'>
            License status
          </div>
        </div>
        { rows }
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.changeFiles = this.changeFiles.bind(this);
    this.toggleTabs = this.toggleTabs.bind(this);
    this.getLicensesFromServer = this.getLicensesFromServer.bind(this);

    this.state = {
      filesRaw: '',
      filesLength: 0,
      files: [],

      tab: 0,
      spinner: false,
      serverResponse: null
    };
  }

  changeFiles(event) {
    let filesRaw = event.target.value;

    let filesLines = filesRaw.split('\n');

    let filesSet = new Set(
      filesLines.map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line;
      }) // Or 'reduce'
    );

    this.setState({
      filesRaw,
      filesLength: filesLines.length,
      files: [...filesSet]
    });
  }

  toggleTabs(idx) {
    return (event) => {
      this.setState({ tab: idx });
    }
  }

  getLicensesFromServer() {
    this.setState({ spinner: true }, () => {
      window.fetch('/filenames/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.state.files)
      }).then((res) => {
        return res.json();
      }).then((data) => {
        this.setState({ spinner: false, serverResponse: data });
      });
    });
  }

  render() {

    let { tab, spinner, filesRaw, filesLength, files } = this.state;

    return (
      <div className={(spinner == true) ? 'app-container loading' : 'app-container'}>
        <h1>Java License Checker</h1>

        <ul className="nav nav-tabs">
          <li onClick={this.toggleTabs(0)} className={(tab === 0) ? 'active' : ''}>
            <a href="#">Files ({filesLength} lines)</a>
          </li>
          <li onClick={this.toggleTabs(1)} className={(tab === 1) ? 'active' : ''}>
            <a href="#">Deduplicated ({files.length} lines)</a>
          </li>
        </ul>

        {tab === 0 ? (
          <FilesArea filesRaw={filesRaw} changeFiles={this.changeFiles} />      
        ) : (
          <textarea readOnly={true} value={files.join('\n')} />
        )}

        <button className="btn btn-primary" disabled={files.length === 0} onClick={this.getLicensesFromServer}>
          Send to server
        </button>

        <Licenses data={this.state.serverResponse} />
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('react-container')
);

