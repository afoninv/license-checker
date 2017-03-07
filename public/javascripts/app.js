'use strict';

const config = {
  loadExtraTimeout: 3000
};

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
            {file.license.status === 'pending' ? (
              <span>Pending...</span>
            ) : file.license.link ? (
              <a href={file.license.link}>{file.license.title || file.license.link}</a>
            ) : (
              <span>{file.license.title || 'N/A'}</span>
            )}
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
        <header className='row'>
          <div className='col-md-6'>
            Java filename
          </div>
          <div className='col-md-6'>
            License status
          </div>
        </header>
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
    this.loadExtra = this.loadExtra.bind(this);

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
    window.clearTimeout(this.state.loadingExtra);

    this.setState({ spinner: true, loadingExtra: null }, () => {
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
        let loadingExtra = null;

        if (data.some((file) => {
          return file.license.status === 'pending';
        })) {
          loadingExtra = window.setTimeout(this.loadExtra.bind(this), config.loadExtraTimeout);
        };

        this.setState({ spinner: false, serverResponse: data, loadingExtra });
      });
    });
  }

  loadExtra() {
    let pendingFiles = this.state.serverResponse
      .filter(function (file) {
        return file.license.status === 'pending';
      })
      .map(function (file) {
        return file.path;
      });
    if (!pendingFiles.length) {
      return;
    }

    window.fetch('/filenames/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pendingFiles)
    }).then((res) => {
      return res.json();
    }).then((data) => {
      let loadingExtra = null;

      if (data.some((file) => {
        return file.license.status === 'pending';
      })) {
        loadingExtra = window.setTimeout(this.loadExtra.bind(this), config.loadExtraTimeout);
      };

      let newData = _.unionBy(data,  this.state.serverResponse, 'path');

      this.setState({ serverResponse: newData, loadingExtra });
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

