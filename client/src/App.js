import React, { Component } from "react";
import SolidityDriveContract from "./contracts/SolidityDrive.json";
import getWeb3 from "./utils/getWeb3";
import { StyledDropZone } from "react-drop-zone";
import FileIcon, { defaultStyles } from "react-file-icon";
import "react-drop-zone/dist/styles.css";
import "bootstrap/dist/css/bootstrap.css";
import "./App.css";
import { Table } from "reactstrap";
import ipfs from "./utils/ipfs";
import { SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS } from "constants";

class App extends Component {
  state = { solidityDrive: [], web3: null, accounts: null, contract: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = SolidityDriveContract.networks[networkId];
      const instance = new web3.eth.Contract(
        SolidityDriveContract.abi,
        deployedNetwork && deployedNetwork.address
      );
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.getFiles);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  getFiles = async () => {
    const { accounts, contract } = this.state;
    let filesLength = await contract.methods
      .getLength()
      .call({ from: accounts[0] });
    let files = [];
    for (let i = 0; i < filesLength; i++) {
      let file = await contract.methods.getFile(i).call({ from: accounts[0] });
      files.push(file);
    }
    this.setState({
      solidityDrive: files
    });
  };

  onDrop = file => {
    // POST to a test endpoint for demo purposes
    let reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = () => this.handleFile(reader, file.name);
  };

  handleFile = async (reader, name) => {
    try {
      const { contract, accounts } = this.state;
      const buffer = await Buffer.from(reader.result);
      console.log(Buffer.isBuffer(buffer));
      ipfs.add(buffer, async (err, result) => {
        if (err) {
          console.log(err);
          return alert(err);
        }
        let timestamp = Date.now;
        let type = name.substr(name.lastIndexOf(".") + 1);
        await contract.methods
          .add(result[0].hash, name, type, timestamp)
          .send({ from: accounts[0], gas: 180000 });
      });
    } catch (error) {
      console.log(error)
      alert(error)
    }
  };

  render() {
    const { solidityDrive } = this.state;
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div className="container pt-4">
          <StyledDropZone onDrop={this.onDrop} multiple={true} />
          <Table>
            <thead>
              <tr>
                <th width="7%">Type</th>
                <th class="text-left">File</th>
                <th class="text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {solidityDrive !== []
                ? solidityDrive.map((item, key) => (
                    <tr>
                      <th width="7%" scope="row">
                        <FileIcon
                          size={30}
                          extension={item[2]}
                          {...defaultStyles[item[2]]}
                        />
                      </th>
                      <td class="text-left">
                        <a href={"https://gateway.ipfs.io/ipfs/" + item[0]}>
                          {item[1]}
                        </a>
                      </td>
                      <td class="text-right">{item[2]}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }
}

export default App;
