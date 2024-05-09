# favoExtend

## 1.0.8

### Patch Changes

- vitestの設定を明示化・ディレクトリ構成を修正しました

## 1.0.7

### Patch Changes

- ifRefプロパティを追加
  - Booleanを示すRefMarkerを判定し、処理をスキップ可能にするdbDefs向けプロパティ`ifRef`を追加しました。
  - 処理#1が実行された結果がBooleanの場合に、`ifRef: "${#1}"`などの設定をすると#1がFalseを返却した場合にその処理をスキップします。
- isAllSame関数・テストを追加
  - Arrayの値がすべて一致している場合にTrue、そうではない場合にFalseを返す関数`isAllSame`を追加しました

## 1.0.6

### Patch Changes

- parseNum,parseBool関数を追加
  - URLクエリ等でstringで受け取った値を、内部的に数値やBool値で扱えるよう、これを変換する処理を追加しました。

## 1.0.5

### Patch Changes

- numCompare関数を追加しました
  - opts.operatorに比較演算識別子を入力することで、最初の値と後に続くすべての値を比較する関数です。
  - 入力の配列が2以下の場合は必ずfalseを返します。

## 1.0.4

### Patch Changes

- jsonMgetからエラー出力を削除
  - jsonMgetにおいても標準のRedis関数の仕様に準拠し、undefined(null)を返すように修正しました。
- jsonGetをjsonGetとjsonGetThrowErrorに分岐
  - getとgetThrowErrorと同様に、jsonについてもエラーの出力有無を関数として分断しました

## 1.0.3

### Patch Changes

- jsonDelの追加漏れ修正
  - jsonDelがmethodsに追加されておらず、呼び出しできなかった問題を修正しました。
- jsonSetSafe関数を追加
  - jsonSet関数では、DBの既存の値を丸ごと置き換える形で上書きしてしまい、データの追加などができない状況でした。
    - jsonSetSafe関数を用いることにより、既存のパスの設定対象以外の値を上書きをせず追加ができるようになりました。

## 1.0.2

### Patch Changes

- `functionName: nowUnixTime`を追加
  - 現在時刻をUnixTime(s,float)で取得します。
- `verifyParameter`関数の削除
  - 型変換がうまく行っていないパターンがあったため、関数を終了しました。
  - 以後は`zod`ライブラリを用いて、`z.(zodObject).parse()`で直に変換してください。

## 1.0.1

### Patch Changes

- `functionName: scan`の挙動が意図しない内容となっていたため、関数の見直しを実施
  - 本関数は条件に一致するすべてのキー取得を目的としていましたが、正しく動作していなかったため関数を削除し、本来期待する動作となる関数`scanAll`へ置き換えました。
  - `scanRegex`についても、本来期待する動作となるように、関数内部を修正しました。

## 1.0.0

### Major Changes

- favoExtendをリリースしました！
  - [利用マニュアルを用意しました](https://zenn.dev/nkte8/books/favoextend-manual)
  - 本リポジトリの内容も現在英語で書かれていますが、今後の状況によっては日本語に修正、または別途READMEの設備を実施していきます。
