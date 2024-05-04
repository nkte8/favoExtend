# favoExtend

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
