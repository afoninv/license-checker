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

    this.onDrop = this.onDrop.bind(this);
    this.changeFiles = this.changeFiles.bind(this);
    this.toggleTabs = this.toggleTabs.bind(this);
    this.getLicensesFromServer = this.getLicensesFromServer.bind(this);

    this.state = {
      apk: null,

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
    return () => {
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

  onDrop(files) {
    this.setState({
      apk: files[0],
      spinner: true
    }, () => {
      let formData = new FormData();
      formData.append('file', this.state.apk, this.state.apk.name);

      window.fetch('/apk-upload/', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
      }).then((res) => {
        return res.json();
      }).then((data) => {
        //got data; extract license info
        this.changeFiles({ target: { value: data.join('\n') } });
        this.setState({ spinner: false, tab: 1 });
      });
    });
  }

  render() {

    let { tab, spinner, filesRaw, filesLength, files, apk } = this.state;

    let tabRendered;
    switch (tab) {
      case 0:
      default: // TODO base64 to file or css
        tabRendered = (
            <Dropzone className="drop-container" activeClassName="drop-container active" onDrop={this.onDrop} multiple={false}>
              <h3>{ apk ? apk.name : 'Drop APK here'}</h3>
              <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgaGVpZ2h0PSIxNnB4IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2cHgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c2tldGNoPSJodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2gvbnMiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48dGl0bGUvPjxkZWZzLz48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGlkPSJJY29ucyB3aXRoIG51bWJlcnMiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIj48ZyBmaWxsPSIjMDAwMDAwIiBpZD0iR3JvdXAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC03NjguMDAwMDAwLCAtNDMyLjAwMDAwMCkiPjxwYXRoIGQ9Ik03NjksNDQ2IEw3ODEsNDQ2IEw3ODEsNDQzIEw3ODMsNDQzIEw3ODMsNDQ2IEw3ODMsNDQ4IEw3NjksNDQ4IFogTTc2OSw0NDMgTDc3MSw0NDMgTDc3MSw0NDYgTDc2OSw0NDYgWiBNNzc4LDQzOCBMNzc4LDQ0NSBMNzc0LDQ0NSBMNzc0LDQzOCBMNzcyLDQzOCBMNzc2LDQzMyBMNzgwLDQzOCBaIE03NzgsNDM4IiBpZD0iUmVjdGFuZ2xlIDIxNyBjb3B5Ii8+PC9nPjwvZz48L3N2Zz4=" />
            </Dropzone>
        );
        break;
      case 1:
        tabRendered = ( <FilesArea filesRaw={filesRaw} changeFiles={this.changeFiles} /> );
        break;
      case 2:
        tabRendered = ( <textarea readOnly={true} value={files.join('\n')} /> );
        break;
    }

    return (
      <div className={(spinner == true) ? 'app-container loading' : 'app-container'}>
        <h1>Java License Checker</h1>

        <ul className="nav nav-tabs">
          <li onClick={this.toggleTabs(0)} className={(tab === 0) ? 'active' : ''}>
            <a href="#">APK Drop Area</a>
          </li>
          <li onClick={this.toggleTabs(1)} className={(tab === 1) ? 'active' : ''}>
            <a href="#">Files ({filesLength} lines)</a>
          </li>
          <li onClick={this.toggleTabs(2)} className={(tab === 2) ? 'active' : ''}>
            <a href="#">Deduplicated ({files.length} lines)</a>
          </li>
        </ul>

        <div className="tab-container">
          { tabRendered }
        </div>

        <button className="btn btn-primary" disabled={files.length === 0} onClick={this.getLicensesFromServer}>
          Get license information
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

