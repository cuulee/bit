/** @flow */
import path from 'path';
import fs from 'fs';
import BitJsonAlreadyExists from '../exceptions/bit-json-already-exists';
import BitJsonNotFound from '../exceptions/bit-json-not-found';
import Remotes from './remotes';
import { BIT_JSON, HIDDEN_BIT_JSON } from '../../constants';

function composePath(bitPath: string, hidden: ?boolean) {
  return path.join(bitPath, hidden ? HIDDEN_BIT_JSON : BIT_JSON);
}

function hasExisting(bitPath: string, hidden): boolean {
  return fs.existsSync(composePath(bitPath, hidden));
}

export default class BitJson {
  /**
   * dependencies in bit json
   **/
  dependencies: {[string]: string};
  env: string = 'webpack-jasmin-plugin';
  version: string = '1';
  remotes: Remotes;
  hidden: boolean;

  constructor({ dependencies = {}, remotes, hidden = false }:
  { dependencies?: {[string]: string}, remotes?: Remotes, hidden?: boolean }) {
    this.dependencies = dependencies;
    this.remotes = remotes || new Remotes();
    this.hidden = hidden;
  }

  /**
   * add dependency
   */
  addDependency(name: string, version: string) {
    this.dependencies[name] = version;
  }

  /**
   * remove dependency
   */
  removeDependency(name: string) {
    delete this.dependencies[name];
  } 

  /**
   * check whether dependency exists
   */
  hasDependency(name: string) {
    return !!this.dependencies[name];
  }

  /**
   * convert to plain object
   */
  toPlainObject() {
    return {
      version: this.version,
      env: this.env,
      remotes: this.remotes.toObject(),
      dependencies: this.dependencies
    };
  }

  /**
   * convert to json
   */  
  toJson() {
    return JSON.stringify(this.toPlainObject(), null, 4);
  }

  /**
   * write to file as json
   */
  write({ dirPath, override = false }: { dirPath: string, override?: boolean }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!override && hasExisting(dirPath)) {
        throw new BitJsonAlreadyExists();
      }

      const repspond = (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      };

      fs.writeFile(
        composePath(dirPath, this.hidden),
        this.toJson(),
        repspond
      );
    });
  }

  /**
   * load existing json in root path
   */
  static load(dirPath: string, hidden: boolean = false): Promise<BitJson> {
    return new Promise((resolve, reject) => {
      if (!hasExisting(dirPath, hidden)) return reject(new BitJsonNotFound());
      return fs.readFile(composePath(dirPath, hidden), (err, data) => {
        if (err) return reject(err);
        const file = JSON.parse(data.toString('utf8'));
        const { dependencies, remotes } = file;
        return resolve(new BitJson({ dependencies, remotes: new Remotes(remotes), hidden }));
      });
    });
  }
}