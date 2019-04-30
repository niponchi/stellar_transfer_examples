const { Keypair, Operation, Server, TransactionBuilder, Network, Asset, TimeoutInfinite } = require('stellar-sdk')

const horizonUrl = 'https://horizon-testnet.stellar.org'
Network.useTestNetwork()
const server = new Server(horizonUrl)
const engine = require('./engine')(server)

const distributeXlm = async (masterAccount, amount, ...walletAccounts) => {
  console.log('distribute xlm')

  const transferFunc = async (source, destinationPublic, asset, amount) => {
    console.log('transfer', asset.code)
    let account = await server.loadAccount(source.publicKey())

    let transaction = new TransactionBuilder(account, { fee: 100 })
      .addOperation(
        Operation.payment({
          amount: `${amount}`,
          asset: asset,
          destination: destinationPublic,
        })
      )
      .setTimeout(TimeoutInfinite)
      .build()

    transaction.sign(source)

    return server.submitTransaction(transaction)
  }

  for (index = 0; index < walletAccounts.length; index++) {
    await transferFunc(masterAccount, walletAccounts[index].publicKey(), Asset.native(), amount)
  }
}

const start = async () => {
  console.log('example 1 - queue')
  const godAccount = Keypair.random()
  const masterAccount = Keypair.random()
  const walletCount = 5
  const wallets = Array.from(Array(walletCount)).map(a => Keypair.random())
  engine.printAccount(godAccount, 'G O D')
  engine.printAccount(masterAccount, 'master')
  wallets.forEach((a, i) => engine.printAccount(a, `wallet${i}`))

  await engine.initAccountWithFriendBot(godAccount.publicKey())
  await engine.createAccounts(godAccount, 2, masterAccount, ...wallets)
  await engine.transferNative(godAccount, masterAccount.publicKey(), 10)

  await engine.showBalance(masterAccount.publicKey())
  await distributeXlm(masterAccount, 2, ...wallets)
  await engine.showBalance(masterAccount.publicKey())
}

start()
  .then(_ => console.log('D O N E'))
  .catch(engine.printError)
