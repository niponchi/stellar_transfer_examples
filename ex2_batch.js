const { Keypair, Operation, Server, TransactionBuilder, Network, Asset, TimeoutInfinite } = require('stellar-sdk')

const horizonUrl = 'https://horizon-testnet.stellar.org'
Network.useTestNetwork()
const server = new Server(horizonUrl)
const engine = require('./engine')(server)

const distributeXlm = async (masterAccount, amount, ...walletAccounts) => {
  console.log('distribute xlm')
  let account = await server.loadAccount(masterAccount.publicKey())
  let txBuilder = new TransactionBuilder(account, { fee: 100 })
    .setTimeout(TimeoutInfinite)

  walletAccounts.forEach(w => {
    txBuilder.addOperation(
      Operation.payment({
        amount: `${amount}`,
        asset: Asset.native(),
        destination: w.publicKey(),
      })
    )
  })

  const transaction = txBuilder.build()
  transaction.sign(masterAccount)

  return server.submitTransaction(transaction)
}

const start = async () => {
  console.log('example 2 - batch')
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
