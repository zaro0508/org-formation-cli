/**
 * Parser and schema for CloudFormation YAML template tags.
 *
 * There are some existing modules out there:
 *    https://github.com/yyolk/cloudformation-js-yaml-schema
 *    https://github.com/KoharaKazuya/js-yaml-schema-cfn
 * But both are poorly documented, with insufficient tests, and don't fully work.
 *
 * This implementation is based on the official AWS python client:
 * https://github.com/aws/aws-cli/blob/develop/awscli/customizations/cloudformation/yamlhelper.py
 *
 * Modified by OC to support other custom tags needed by org-formation.
 */
'use strict';

import path from 'path';
import yaml  from 'js-yaml';
import nunjucks from 'nunjucks';

nunjucks.installJinjaCompat();
nunjucks.configure(
    '.',
    {
        autoescape: true,
        trimBlocks: true,
        lstripBlocks: true,
        throwOnUndefined: true,
    });

/**
 * Split a string on the given separator just once, returning an array of two parts, or null.
 */
const splitOne =(str: string, sep: string): string[] | null => {
  const index = str.indexOf(sep);
  return index < 0 ? null : [str.slice(0, index), str.slice(index + sep.length)];
};

/**
 * Returns true if obj is a representation of a CloudFormation intrinsic, i.e. an object with a
 * single property at key keyName.
 */
const checkType =(obj: {}, keyName: string): boolean => {
  return obj && typeof obj === 'object' && Object.keys(obj).length === 1 &&
    obj.hasOwnProperty(keyName);
};


const overrides: any = {
  // ShortHand notation for !GetAtt accepts Resource.Attribute format while the standard notation
  // is to use an array [Resource, Attribute]. Convert shorthand to standard format.
  GetAtt: {
    parse: (data: any): any => typeof data === 'string' ? splitOne(data, '.') : data,
    dump: (data: []): string  => data.join('.'),
  },
};

const applyOverrides = (data: any, tag: string, method: string): any => {
  return overrides[tag] ? overrides[tag][method](data) : data;
};

/**
 * Generic tag-creating helper. For the given name of the form 'Fn::Something' (or just
 * 'Something'), creates a js-yaml Type object that can parse and dump this type. It creates it
 * for all types of values, for simplicity and because that's how the official Python version
 * works.
 */
const makeTagTypes = (name: string): yaml.Type[] => {
  const parts = splitOne(name, '::');
  const tag = parts ? parts[1] : name;
  // Translate in the same way for all types, to match Python's generic translation.
  return ['scalar', 'sequence', 'mapping'].map(kind => new yaml.Type('!' + tag, {
    kind: kind as any,
    construct: (data: any): any => ({[name]: applyOverrides(data, tag, 'parse')}),
    predicate: (obj: any): boolean => checkType(obj, name),
    represent: (obj: any): any => applyOverrides(obj[name], tag, 'dump'),
  }));
};

/**
 * This list is from
 * http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html
 * Note that the Python version handles ANY tag that starts with ! in the same way (translating it
 * to Fn:: prefix, but js-yaml requires listing tags explicitly.
 */
const supportedFunctions = [
  'Fn::Base64',
  'Fn::Cidr',
  'Fn::FindInMap',
  'Fn::GetAtt',
  'Fn::GetAZs',
  'Fn::ImportValue',
  'Fn::Join',
  'Fn::Select',
  'Fn::Split',
  'Fn::Sub',
  'Fn::Transform',
  'Ref',
  'Condition',
  'Fn::And',
  'Fn::Equals',
  'Fn::If',
  'Fn::Not',
  'Fn::Or',
  'Fn::CopyValue',
  'Fn::ReadFile',
  'Fn::MD5',
  'Fn::MD5Dir',
  'Fn::MD5File',
  'Fn::JsonString',
  'Fn::Include',
];

const allTagTypes = [];
for (const name of supportedFunctions) {
  allTagTypes.push(...makeTagTypes(name));
}

const cfnSchema = yaml.DEFAULT_SCHEMA.extend(allTagTypes);


export const schema = cfnSchema;

export const yamlParse = (input: string): any => {
    return yaml.load(input, { schema: cfnSchema });
};

export const njParse = (input: string, filename: string): any => {
  const Data = {
      names: ['jason', 'marty'],
  };
  const res = nunjucks.renderString(input, {Data});
  return yaml.load(res);
};

export const yamlDump = (input: any): string => {
  return yaml.dump(input, { schema: cfnSchema });
};
